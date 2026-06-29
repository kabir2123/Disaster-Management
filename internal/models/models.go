package models

import "time"

const (
	RoleCitizen     = "citizen"
	RoleResponder   = "responder"
	RoleAdmin       = "admin"
	RoleCoordinator = "coordinator"

	StatusOpen       = "open"
	StatusAssigned   = "assigned"
	StatusInProgress = "in_progress"
	StatusResolved   = "resolved"
	StatusEscalated  = "escalated"

	ResourceAvailable = "available"
	ResourceAssigned  = "assigned"
	ResourceDepleted  = "depleted"
	ResourceOffline   = "offline"
)

type User struct {
	UserID       string `dynamodbav:"userID" json:"userID"`
	Contact      string `dynamodbav:"contact" json:"contact"`
	PasswordHash string `dynamodbav:"passwordHash" json:"-"`
	Role         string `dynamodbav:"role" json:"role"`
	DistrictID   string `dynamodbav:"districtID" json:"districtID"`
	Name         string `dynamodbav:"name" json:"name"`
	CreatedAt    string `dynamodbav:"createdAt" json:"createdAt"`
}

type Incident struct {
	DistrictID   string   `dynamodbav:"districtID" json:"districtID"`
	IncidentID   string   `dynamodbav:"incidentID" json:"incidentID"`
	Timestamp    string   `dynamodbav:"timestamp" json:"timestamp"`
	UpdatedAt    string   `dynamodbav:"updatedAt" json:"updatedAt"`
	ReporterID   string   `dynamodbav:"reporterID" json:"reporterID"`
	Severity     int      `dynamodbav:"severity" json:"severity"`
	Location     string   `dynamodbav:"location" json:"location"`
	Description  string   `dynamodbav:"description" json:"description"`
	Status       string   `dynamodbav:"status" json:"status"`
	AssignedTo   string   `dynamodbav:"assignedTo,omitempty" json:"assignedTo,omitempty"`
	EvidenceKeys []string `dynamodbav:"evidenceKeys,omitempty" json:"evidenceKeys,omitempty"`
	ResolveNote  string   `dynamodbav:"resolveNote,omitempty" json:"resolveNote,omitempty"`
}

type Resource struct {
	DistrictID    string `dynamodbav:"districtID" json:"districtID"`
	ResourceID    string `dynamodbav:"resourceID" json:"resourceID"`
	Type          string `dynamodbav:"type" json:"type"`
	Capacity      int    `dynamodbav:"capacity" json:"capacity"`
	Availability  string `dynamodbav:"availability" json:"availability"`
	CoordinatorID string `dynamodbav:"coordinatorID" json:"coordinatorID"`
	CreatedAt     string `dynamodbav:"createdAt" json:"createdAt"`
}

func NowISO() string {
	return time.Now().UTC().Format(time.RFC3339)
}

func ValidRole(role string) bool {
	switch role {
	case RoleCitizen, RoleResponder, RoleAdmin, RoleCoordinator:
		return true
	default:
		return false
	}
}

func ValidIncidentStatus(status string) bool {
	switch status {
	case StatusOpen, StatusAssigned, StatusInProgress, StatusResolved, StatusEscalated:
		return true
	default:
		return false
	}
}

func ValidResourceStatus(status string) bool {
	switch status {
	case ResourceAvailable, ResourceAssigned, ResourceDepleted, ResourceOffline:
		return true
	default:
		return false
	}
}
