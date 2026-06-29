package main

import (
	"context"
	"encoding/json"
	"io"
	"log"
	"net/http"
	"os"
	"strings"

	"github.com/aws/aws-lambda-go/events"
	"github.com/aws/aws-lambda-go/lambda"
	"github.com/kabirpanda/resq/internal/models"
	"github.com/kabirpanda/resq/internal/store"
)

type smsRequest struct {
	Phone       string `json:"phone"`
	Message     string `json:"message"`
	DistrictID  string `json:"districtID"`
	Location    string `json:"location"`
	Severity    int    `json:"severity"`
}

func main() {
	if os.Getenv("AWS_LAMBDA_FUNCTION_NAME") == "" {
		http.HandleFunc("/sms", localSMS)
		log.Println("sms ingest local server on :8081")
		log.Fatal(http.ListenAndServe(":8081", nil))
	}
	lambda.Start(handle)
}

func handle(ctx context.Context, req events.APIGatewayProxyRequest) (events.APIGatewayProxyResponse, error) {
	incident, status, body := processSMS(ctx, req.Body)
	if status != http.StatusCreated {
		return events.APIGatewayProxyResponse{StatusCode: status, Body: body, Headers: map[string]string{"Content-Type": "application/json"}}, nil
	}
	out, _ := json.Marshal(incident)
	return events.APIGatewayProxyResponse{StatusCode: status, Body: string(out), Headers: map[string]string{"Content-Type": "application/json"}}, nil
}

func localSMS(w http.ResponseWriter, r *http.Request) {
	incident, status, body := processSMS(r.Context(), readBody(r))
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_, _ = w.Write([]byte(body))
	_ = incident
}

func processSMS(ctx context.Context, raw string) (models.Incident, int, string) {
	var req smsRequest
	if err := json.Unmarshal([]byte(raw), &req); err != nil {
		return models.Incident{}, http.StatusBadRequest, `{"error":"invalid json"}`
	}
	if req.Phone == "" || req.Message == "" {
		return models.Incident{}, http.StatusBadRequest, `{"error":"phone and message required"}`
	}
	if req.DistrictID == "" {
		req.DistrictID = os.Getenv("DEFAULT_DISTRICT_ID")
		if req.DistrictID == "" {
			req.DistrictID = "default"
		}
	}
	if req.Severity < 1 || req.Severity > 5 {
		req.Severity = 3
	}
	if req.Location == "" {
		req.Location = "SMS report"
	}

	s, err := store.New(ctx)
	if err != nil {
		return models.Incident{}, http.StatusInternalServerError, `{"error":"store init failed"}`
	}

	reporterID := "sms:" + strings.TrimSpace(req.Phone)
	now := models.NowISO()
	incident := models.Incident{
		DistrictID:  req.DistrictID,
		IncidentID:  store.NewIncidentID(),
		Timestamp:   now,
		UpdatedAt:   now,
		ReporterID:  reporterID,
		Severity:    req.Severity,
		Location:    req.Location,
		Description: req.Message,
		Status:      models.StatusOpen,
	}
	if err := s.CreateIncident(ctx, incident); err != nil {
		return models.Incident{}, http.StatusInternalServerError, `{"error":"could not create incident"}`
	}
	out, _ := json.Marshal(incident)
	return incident, http.StatusCreated, string(out)
}

func readBody(r *http.Request) string {
	b, _ := io.ReadAll(r.Body)
	return string(b)
}
