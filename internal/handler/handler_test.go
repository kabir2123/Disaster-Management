package handler_test

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/kabirpanda/resq/internal/auth"
	"github.com/kabirpanda/resq/internal/handler"
	"github.com/kabirpanda/resq/internal/notify"
	"github.com/kabirpanda/resq/internal/storage"
	"github.com/kabirpanda/resq/internal/store"
)

func TestHealth(t *testing.T) {
	h := handler.New(nil, &notify.Notifier{}, &storage.Evidence{})
	req := httptest.NewRequest(http.MethodGet, "/health", nil)
	rec := httptest.NewRecorder()
	h.Router().ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, want 200", rec.Code)
	}
	var body map[string]string
	if err := json.NewDecoder(rec.Body).Decode(&body); err != nil {
		t.Fatal(err)
	}
	if body["status"] != "ok" {
		t.Fatalf("status body = %q", body["status"])
	}
}

func TestCORSPreflight(t *testing.T) {
	h := handler.New(nil, &notify.Notifier{}, &storage.Evidence{})
	req := httptest.NewRequest(http.MethodOptions, "/incident/report", nil)
	rec := httptest.NewRecorder()
	h.Router().ServeHTTP(rec, req)

	if rec.Code != http.StatusNoContent {
		t.Fatalf("status = %d, want 204", rec.Code)
	}
	if got := rec.Header().Get("Access-Control-Allow-Origin"); got != "*" {
		t.Fatalf("Access-Control-Allow-Origin = %q, want *", got)
	}
}

func TestRegisterValidation(t *testing.T) {
	h := handler.New(&store.Store{}, &notify.Notifier{}, &storage.Evidence{})
	body := bytes.NewBufferString(`{"contact":"","password":"","role":"bad","districtID":""}`)
	req := httptest.NewRequest(http.MethodPost, "/auth/register", body)
	rec := httptest.NewRecorder()
	h.Router().ServeHTTP(rec, req)

	if rec.Code != http.StatusBadRequest {
		t.Fatalf("status = %d, want 400", rec.Code)
	}
}

func TestLoginMissingAuth(t *testing.T) {
	h := handler.New(&store.Store{}, &notify.Notifier{}, &storage.Evidence{})
	req := httptest.NewRequest(http.MethodGet, "/incident/district-a", nil)
	rec := httptest.NewRecorder()
	h.Router().ServeHTTP(rec, req)

	if rec.Code != http.StatusUnauthorized {
		t.Fatalf("status = %d, want 401", rec.Code)
	}
}

func TestAuthenticatedRoleMismatchReturnsForbidden(t *testing.T) {
	t.Setenv("JWT_SECRET", "test-secret")
	token, err := auth.CreateToken([]byte("test-secret"), "user-1", "citizen", "district-a", time.Hour)
	if err != nil {
		t.Fatal(err)
	}

	h := handler.New(&store.Store{}, &notify.Notifier{}, &storage.Evidence{})
	req := httptest.NewRequest(http.MethodPost, "/resource/register", nil)
	req.Header.Set("Authorization", "Bearer "+token)
	rec := httptest.NewRecorder()
	h.Router().ServeHTTP(rec, req)

	if rec.Code != http.StatusForbidden {
		t.Fatalf("status = %d, want 403", rec.Code)
	}
}
