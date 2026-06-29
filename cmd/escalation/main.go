package main

import (
	"context"
	"fmt"
	"log"
	"time"

	"github.com/aws/aws-lambda-go/lambda"
	"github.com/kabirpanda/resq/internal/models"
	"github.com/kabirpanda/resq/internal/notify"
	"github.com/kabirpanda/resq/internal/store"
)

func main() {
	lambda.Start(handle)
}

func handle(ctx context.Context) error {
	s, err := store.New(ctx)
	if err != nil {
		return err
	}
	n, err := notify.New(ctx)
	if err != nil {
		return err
	}

	cutoff := time.Now().Add(-30 * time.Minute)
	statuses := []string{models.StatusOpen, models.StatusAssigned}
	escalated := 0

	for _, status := range statuses {
		incidents, err := s.ListStaleIncidents(ctx, status, cutoff)
		if err != nil {
			return err
		}
		for _, incident := range incidents {
			incident.Status = models.StatusEscalated
			incident.UpdatedAt = models.NowISO()
			if err := s.UpdateIncident(ctx, incident); err != nil {
				return err
			}
			msg := fmt.Sprintf("Incident %s in district %s escalated after 30 minutes (%s)",
				incident.IncidentID, incident.DistrictID, incident.Location)
			if err := n.Publish(ctx, "ResQ Escalation", msg); err != nil {
				log.Printf("notify failed: %v", err)
			}
			escalated++
		}
	}

	log.Printf("escalated %d incidents", escalated)
	return nil
}
