package handler

import (
	"context"
	"encoding/json"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/kabirpanda/resq/internal/auth"
	"github.com/kabirpanda/resq/internal/middleware"
	"github.com/kabirpanda/resq/internal/models"
	"github.com/kabirpanda/resq/internal/notify"
	"github.com/kabirpanda/resq/internal/storage"
	"github.com/kabirpanda/resq/internal/store"
)

type Handler struct {
	store    *store.Store
	notifier *notify.Notifier
	evidence *storage.Evidence
	secret   []byte
}

func New(s *store.Store, n *notify.Notifier, e *storage.Evidence) *Handler {
	secret := os.Getenv("JWT_SECRET")
	if secret == "" {
		secret = "dev-secret-change-me"
	}
	return &Handler{store: s, notifier: n, evidence: e, secret: []byte(secret)}
}

func (h *Handler) Router() http.Handler {
	mux := http.NewServeMux()

	mux.HandleFunc("GET /health", h.health)
	mux.HandleFunc("POST /auth/register", h.register)
	mux.HandleFunc("POST /auth/login", h.login)

	auth := func(fn http.HandlerFunc, roles ...string) http.HandlerFunc {
		if len(roles) > 0 {
			fn = middleware.RequireRoles(roles...)(fn)
		}
		return middleware.WithAuth(h.secret, fn)
	}

	mux.HandleFunc("POST /incident/report", auth(h.reportIncident, models.RoleCitizen, models.RoleAdmin, models.RoleResponder))
	mux.HandleFunc("GET /incident/{district}", auth(h.listIncidents, models.RoleAdmin, models.RoleResponder, models.RoleCoordinator, models.RoleCitizen))
	mux.HandleFunc("GET /incident/{district}/{id}", auth(h.getIncident, models.RoleAdmin, models.RoleResponder, models.RoleCitizen, models.RoleCoordinator))
	mux.HandleFunc("PATCH /incident/{district}/{id}/assign", auth(h.assignIncident, models.RoleAdmin))
	mux.HandleFunc("PATCH /incident/{district}/{id}/resolve", auth(h.resolveIncident, models.RoleAdmin, models.RoleResponder))
	mux.HandleFunc("POST /incident/{district}/{id}/evidence", auth(h.uploadEvidence, models.RoleCitizen, models.RoleAdmin, models.RoleResponder))

	mux.HandleFunc("POST /resource/register", auth(h.registerResource, models.RoleAdmin, models.RoleCoordinator))
	mux.HandleFunc("GET /resource/{district}", auth(h.listResources, models.RoleAdmin, models.RoleCoordinator, models.RoleResponder))
	mux.HandleFunc("PATCH /resource/{district}/{id}/status", auth(h.updateResourceStatus, models.RoleAdmin, models.RoleCoordinator))

	return WithCORS(mux)
}

func WithCORS(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET,POST,PATCH,OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Authorization,Content-Type")
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		next.ServeHTTP(w, r)
	})
}

func (h *Handler) health(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

type registerRequest struct {
	Name       string `json:"name"`
	Contact    string `json:"contact"`
	Password   string `json:"password"`
	Role       string `json:"role"`
	DistrictID string `json:"districtID"`
}

func (h *Handler) register(w http.ResponseWriter, r *http.Request) {
	var req registerRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid json")
		return
	}
	req.Contact = normalizeContact(req.Contact)
	req.DistrictID = strings.TrimSpace(req.DistrictID)
	if req.Contact == "" || req.Password == "" || req.DistrictID == "" || !models.ValidRole(req.Role) {
		writeError(w, http.StatusBadRequest, "missing or invalid fields")
		return
	}
	hash, err := auth.HashPassword(req.Password)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not hash password")
		return
	}
	user := models.User{
		UserID:       store.NewUserID(),
		Name:         req.Name,
		Contact:      req.Contact,
		PasswordHash: hash,
		Role:         req.Role,
		DistrictID:   req.DistrictID,
		CreatedAt:    models.NowISO(),
	}
	if err := h.store.CreateUser(r.Context(), user); err != nil {
		if err == store.ErrAlreadyExists {
			writeError(w, http.StatusConflict, "user already exists")
			return
		}
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusCreated, map[string]any{
		"userID":     user.UserID,
		"role":       user.Role,
		"districtID": user.DistrictID,
	})
}

type loginRequest struct {
	Contact  string `json:"contact"`
	Password string `json:"password"`
}

func (h *Handler) login(w http.ResponseWriter, r *http.Request) {
	var req loginRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid json")
		return
	}
	req.Contact = normalizeContact(req.Contact)
	user, err := h.store.GetUserByContact(r.Context(), req.Contact)
	if err != nil {
		if err == store.ErrNotFound {
			writeError(w, http.StatusUnauthorized, "invalid credentials")
			return
		}
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	if auth.CheckPassword(user.PasswordHash, req.Password) != nil {
		writeError(w, http.StatusUnauthorized, "invalid credentials")
		return
	}
	token, err := auth.CreateToken(h.secret, user.UserID, user.Role, user.DistrictID, 24*time.Hour)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not create token")
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"token": token})
}

func normalizeContact(contact string) string {
	return strings.ToLower(strings.TrimSpace(contact))
}

type reportIncidentRequest struct {
	Severity    int    `json:"severity"`
	Location    string `json:"location"`
	Description string `json:"description"`
	DistrictID  string `json:"districtID"`
}

func (h *Handler) reportIncident(w http.ResponseWriter, r *http.Request) {
	claims := middleware.Claims(r)
	var req reportIncidentRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid json")
		return
	}
	districtID := req.DistrictID
	if districtID == "" {
		districtID = claims.DistrictID
	}
	if districtID != claims.DistrictID && claims.Role != models.RoleAdmin {
		writeError(w, http.StatusForbidden, "district mismatch")
		return
	}
	if req.Severity < 1 || req.Severity > 5 || req.Location == "" {
		writeError(w, http.StatusBadRequest, "severity (1-5) and location required")
		return
	}
	now := models.NowISO()
	incident := models.Incident{
		DistrictID:  districtID,
		IncidentID:  store.NewIncidentID(),
		Timestamp:   now,
		UpdatedAt:   now,
		ReporterID:  claims.UserID,
		Severity:    req.Severity,
		Location:    req.Location,
		Description: req.Description,
		Status:      models.StatusOpen,
	}
	if err := h.store.CreateIncident(r.Context(), incident); err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	if req.Severity == 5 {
		_ = h.notifier.Publish(r.Context(), "ResQ Critical Incident",
			"Severity 5 incident in district "+districtID+": "+req.Location)
	}
	writeJSON(w, http.StatusCreated, incident)
}

func (h *Handler) listIncidents(w http.ResponseWriter, r *http.Request) {
	claims := middleware.Claims(r)
	districtID := r.PathValue("district")
	if districtID != claims.DistrictID {
		writeError(w, http.StatusForbidden, "district mismatch")
		return
	}
	incidents, err := h.store.ListIncidentsByDistrict(r.Context(), districtID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	responses := h.incidentResponses(r.Context(), incidents)
	writeJSON(w, http.StatusOK, responses)
}

func (h *Handler) getIncident(w http.ResponseWriter, r *http.Request) {
	claims := middleware.Claims(r)
	districtID := r.PathValue("district")
	incidentID := r.PathValue("id")
	if districtID != claims.DistrictID {
		writeError(w, http.StatusForbidden, "district mismatch")
		return
	}
	incident, err := h.store.GetIncident(r.Context(), districtID, incidentID)
	if err != nil {
		if err == store.ErrNotFound {
			writeError(w, http.StatusNotFound, "incident not found")
			return
		}
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, h.incidentResponse(r.Context(), *incident))
}

func (h *Handler) incidentResponses(ctx context.Context, incidents []models.Incident) []models.IncidentResponse {
	responses := make([]models.IncidentResponse, 0, len(incidents))
	for _, incident := range incidents {
		responses = append(responses, h.incidentResponse(ctx, incident))
	}
	return responses
}

func (h *Handler) incidentResponse(ctx context.Context, incident models.Incident) models.IncidentResponse {
	response := models.IncidentResponse{Incident: incident}
	if user, err := h.store.GetUserByID(ctx, incident.ReporterID); err == nil {
		response.ReporterName = user.Name
	}
	if len(incident.EvidenceKeys) > 0 {
		response.EvidenceFiles = make([]models.EvidenceFile, 0, len(incident.EvidenceKeys))
		for _, key := range incident.EvidenceKeys {
			file := models.EvidenceFile{Key: key}
			if url, err := h.evidence.PresignDownload(ctx, key); err == nil {
				file.URL = url
			}
			response.EvidenceFiles = append(response.EvidenceFiles, file)
		}
	}
	return response
}

type assignRequest struct {
	AssignedTo string `json:"assignedTo"`
}

func (h *Handler) assignIncident(w http.ResponseWriter, r *http.Request) {
	claims := middleware.Claims(r)
	districtID := r.PathValue("district")
	incidentID := r.PathValue("id")
	if districtID != claims.DistrictID {
		writeError(w, http.StatusForbidden, "district mismatch")
		return
	}
	var req assignRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.AssignedTo == "" {
		writeError(w, http.StatusBadRequest, "assignedTo required")
		return
	}
	incident, err := h.store.GetIncident(r.Context(), districtID, incidentID)
	if err != nil {
		if err == store.ErrNotFound {
			writeError(w, http.StatusNotFound, "incident not found")
			return
		}
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	if incident.Status == models.StatusResolved {
		writeError(w, http.StatusBadRequest, "incident already resolved")
		return
	}
	incident.AssignedTo = req.AssignedTo
	incident.Status = models.StatusAssigned
	incident.UpdatedAt = models.NowISO()
	if err := h.store.UpdateIncident(r.Context(), *incident); err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, incident)
}

type resolveRequest struct {
	Note string `json:"note"`
}

func (h *Handler) resolveIncident(w http.ResponseWriter, r *http.Request) {
	claims := middleware.Claims(r)
	districtID := r.PathValue("district")
	incidentID := r.PathValue("id")
	if districtID != claims.DistrictID {
		writeError(w, http.StatusForbidden, "district mismatch")
		return
	}
	var req resolveRequest
	_ = json.NewDecoder(r.Body).Decode(&req)
	incident, err := h.store.GetIncident(r.Context(), districtID, incidentID)
	if err != nil {
		if err == store.ErrNotFound {
			writeError(w, http.StatusNotFound, "incident not found")
			return
		}
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	if claims.Role == models.RoleResponder && incident.AssignedTo != claims.UserID {
		writeError(w, http.StatusForbidden, "not assigned to you")
		return
	}
	incident.Status = models.StatusResolved
	incident.ResolveNote = req.Note
	incident.UpdatedAt = models.NowISO()
	if err := h.store.UpdateIncident(r.Context(), *incident); err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, incident)
}

type evidenceRequest struct {
	Filename string `json:"filename"`
}

func (h *Handler) uploadEvidence(w http.ResponseWriter, r *http.Request) {
	claims := middleware.Claims(r)
	districtID := r.PathValue("district")
	incidentID := r.PathValue("id")
	if districtID != claims.DistrictID {
		writeError(w, http.StatusForbidden, "district mismatch")
		return
	}
	var req evidenceRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.Filename == "" {
		writeError(w, http.StatusBadRequest, "filename required")
		return
	}
	incident, err := h.store.GetIncident(r.Context(), districtID, incidentID)
	if err != nil {
		if err == store.ErrNotFound {
			writeError(w, http.StatusNotFound, "incident not found")
			return
		}
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	url, key, err := h.evidence.PresignUpload(r.Context(), districtID, incidentID, sanitizeFilename(req.Filename))
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	incident.EvidenceKeys = append(incident.EvidenceKeys, key)
	incident.UpdatedAt = models.NowISO()
	if err := h.store.UpdateIncident(r.Context(), *incident); err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"uploadURL": url, "key": key})
}

type registerResourceRequest struct {
	Type          string `json:"type"`
	Capacity      int    `json:"capacity"`
	DistrictID    string `json:"districtID"`
	CoordinatorID string `json:"coordinatorID"`
}

func (h *Handler) registerResource(w http.ResponseWriter, r *http.Request) {
	claims := middleware.Claims(r)
	var req registerResourceRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid json")
		return
	}
	districtID := req.DistrictID
	if districtID == "" {
		districtID = claims.DistrictID
	}
	if districtID != claims.DistrictID {
		writeError(w, http.StatusForbidden, "district mismatch")
		return
	}
	if req.Type == "" || req.Capacity < 1 {
		writeError(w, http.StatusBadRequest, "type and capacity required")
		return
	}
	coordinatorID := req.CoordinatorID
	if coordinatorID == "" {
		coordinatorID = claims.UserID
	}
	resource := models.Resource{
		DistrictID:    districtID,
		ResourceID:    store.NewResourceID(),
		Type:          req.Type,
		Capacity:      req.Capacity,
		Availability:  models.ResourceAvailable,
		CoordinatorID: coordinatorID,
		CreatedAt:     models.NowISO(),
	}
	if err := h.store.CreateResource(r.Context(), resource); err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusCreated, resource)
}

func (h *Handler) listResources(w http.ResponseWriter, r *http.Request) {
	claims := middleware.Claims(r)
	districtID := r.PathValue("district")
	if districtID != claims.DistrictID {
		writeError(w, http.StatusForbidden, "district mismatch")
		return
	}
	resources, err := h.store.ListResourcesByDistrict(r.Context(), districtID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, resources)
}

type statusRequest struct {
	Availability string `json:"availability"`
}

func (h *Handler) updateResourceStatus(w http.ResponseWriter, r *http.Request) {
	claims := middleware.Claims(r)
	districtID := r.PathValue("district")
	resourceID := r.PathValue("id")
	if districtID != claims.DistrictID {
		writeError(w, http.StatusForbidden, "district mismatch")
		return
	}
	var req statusRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || !models.ValidResourceStatus(req.Availability) {
		writeError(w, http.StatusBadRequest, "valid availability required")
		return
	}
	resource, err := h.store.GetResource(r.Context(), districtID, resourceID)
	if err != nil {
		if err == store.ErrNotFound {
			writeError(w, http.StatusNotFound, "resource not found")
			return
		}
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	resource.Availability = req.Availability
	if err := h.store.UpdateResource(r.Context(), *resource); err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, resource)
}

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(v)
}

func writeError(w http.ResponseWriter, status int, msg string) {
	writeJSON(w, status, map[string]string{"error": msg})
}

func sanitizeFilename(name string) string {
	name = strings.ReplaceAll(name, "/", "-")
	name = strings.ReplaceAll(name, "\\", "-")
	if name == "" {
		return "file"
	}
	return name
}
