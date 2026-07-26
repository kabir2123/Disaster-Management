// Command seed populates the ResQ data store with a realistic demo district so
// the app never renders empty for a reviewer. It writes through the same store
// and models the API uses, so it exercises the real stack end to end
// (DynamoDB -> Go handlers -> the response shape the frontend consumes).
//
// Usage (DynamoDB Local, matching docker-compose):
//
//	DYNAMODB_ENDPOINT_URL=http://localhost:8008 \
//	AWS_ACCESS_KEY_ID=local AWS_SECRET_ACCESS_KEY=local AWS_DEFAULT_REGION=us-east-1 \
//	USERS_TABLE=resq-users INCIDENTS_TABLE=resq-incidents RESOURCES_TABLE=resq-resources \
//	go run ./cmd/seed
//
// It is deterministic (fixed RNG seed) and idempotent for incidents/resources
// (stable keys overwrite on re-run). Users are created once; existing contacts
// are skipped.
package main

import (
	"context"
	"errors"
	"fmt"
	"log"
	"math"
	"math/rand"
	"time"

	"github.com/kabirpanda/resq/internal/auth"
	"github.com/kabirpanda/resq/internal/models"
	"github.com/kabirpanda/resq/internal/store"
)

const demoPassword = "demo1234"

// district describes one seeded operational area.
type district struct {
	id        string
	label     string
	incidents int
	places    []place
}

// place is a real town/landmark plus optional sub-locations used to build
// location strings that read like something a citizen actually typed. lat/lng
// are approximate town centres; each incident jitters off them so pins spread.
type place struct {
	town      string
	lat       float64
	lng       float64
	landmarks []string
}

// Ernakulam (Kerala) — primary demo district, flood/urban incidents.
var ernakulam = district{
	id:        "ernakulam",
	label:     "Ernakulam",
	incidents: 150,
	places: []place{
		{"Kochi", 9.9312, 76.2673, []string{"Marine Drive walkway", "MG Road", "Kaloor bus stand", "Vyttila Mobility Hub", "Fort Kochi jetty", "Mattancherry godowns", "Willingdon Island", "Menaka junction"}},
		{"Aluva", 10.1004, 76.3570, []string{"UC College road", "Manappuram", "NH-544 flyover", "Metro station", "riverside market"}},
		{"Perumbavoor", 10.1074, 76.4750, []string{"plywood market", "MC Road", "Kanjirapally junction"}},
		{"Muvattupuzha", 9.9894, 76.5790, []string{"town bridge", "Kacheri junction", "boat jetty"}},
		{"Kothamangalam", 10.0553, 76.6320, []string{"MA College road", "market road"}},
		{"Angamaly", 10.1960, 76.3860, []string{"NH bypass", "railway gate", "Little Flower junction"}},
		{"Kalady", 10.1700, 76.4370, []string{"Mannam road", "temple ghat"}},
		{"Kakkanad", 10.0158, 76.3419, []string{"Infopark phase 1", "civil station", "Seaport-Airport Road"}},
		{"North Paravur", 10.1470, 76.2290, []string{"boat jetty", "Munambam road"}},
		{"Tripunithura", 9.9450, 76.3490, []string{"Hill Palace road", "Statue junction"}},
		{"Kalamassery", 10.0540, 76.3210, []string{"HMT colony", "CUSAT gate", "bypass service road"}},
		{"Chellanam", 9.8000, 76.2800, []string{"coastal road", "sea wall", "harbour"}},
		{"Nedumbassery", 10.1520, 76.3920, []string{"airport approach road", "Athani junction"}},
		{"Eloor", 10.0680, 76.2920, []string{"industrial belt", "ferry point"}},
		{"Piravom", 9.8690, 76.4980, []string{"town centre", "Ramamangalam road"}},
		{"Maradu", 9.9310, 76.3230, []string{"NH 66 service road", "Nettoor bridge"}},
	},
}

// Kodagu (Coorg, Karnataka) — secondary hill district, landslide incidents.
var kodagu = district{
	id:        "kodagu",
	label:     "Kodagu",
	incidents: 55,
	places: []place{
		{"Madikeri", 12.4200, 75.7390, []string{"Raja's Seat road", "General Thimayya Road", "Abbey Falls approach", "Stuart Hill"}},
		{"Virajpet", 12.1970, 75.8050, []string{"town bus stand", "Gonikoppal road"}},
		{"Kushalnagar", 12.4570, 75.9560, []string{"Harangi backwaters", "Nisargadhama entrance", "Cauvery bridge"}},
		{"Napoklu", 12.4300, 75.6800, []string{"Bhagamandala road", "market junction"}},
		{"Somwarpet", 12.5960, 75.8480, []string{"Shanivarsanthe road", "coffee estate track"}},
		{"Bhagamandala", 12.3830, 75.5230, []string{"Talacauvery ghat", "triveni sangama"}},
		{"Ponnampet", 12.1450, 75.9430, []string{"forest college road", "Gonikoppal junction"}},
		{"Suntikoppa", 12.4770, 75.8250, []string{"NH 275 curve", "estate labour lines"}},
		{"Galibeedu", 12.4000, 75.6900, []string{"landslide zone", "hill road km 12"}},
		{"Kakkabe", 12.3600, 75.6300, []string{"Padi Igguthappa road", "Nalknad palace track"}},
	},
}

// reporterFirst / reporterLast build plausible South Indian citizen names.
var reporterFirst = []string{
	"Rahul", "Anjali", "Sooraj", "Meera", "Vishnu", "Fathima", "Arun", "Divya",
	"Nithin", "Aleena", "Jomon", "Sandra", "Rakesh", "Keerthana", "Basil",
	"Reshma", "Tobias", "Ann", "Girish", "Lakshmi", "Ashwin", "Neha", "Manu",
	"Sneha", "Praveen", "Aparna", "Shibu", "Elizabeth", "Naveen", "Ramya",
	"Harshith", "Deepa", "Sathish", "Nanda", "Ganesh",
}
var reporterLast = []string{
	"Nair", "Menon", "Thomas", "Pillai", "Kurian", "Varghese", "Iyer", "Rao",
	"Shetty", "Gowda", "Joseph", "Mohan", "Das", "Prasad", "George", "Kutty",
	"Antony", "Bhat", "Poovathingal", "Chandran",
}

// Incident content pools, grouped loosely by kind. Each kind has a short and a
// long description so table rows vary from one line to paragraph-length.
type kind struct {
	short []string
	long  []string
}

var floodKind = kind{
	short: []string{
		"Water entering ground-floor shops.",
		"Road submerged, knee-deep near the junction.",
		"Drain overflowing onto the main road.",
		"Waterlogging, two-wheelers stalling.",
	},
	long: []string{
		"Water started rising around 2am after the overnight rain and is now above the doorsteps of the row of shops near the junction. Three families on the ground floor have moved upstairs but an elderly couple in the last house cannot use the stairs. The approach road is fully under water so a small boat may be needed to reach them. Drinking water has also been cut since last evening.",
		"The stormwater drain along the market road has been blocked for two days and now the whole stretch is flooded. Autos and two-wheelers are getting stuck and one scooter fell in the covered drain which is not visible under the water. Please send someone to barricade it before there is an accident, and the fish market waste is making the water very dirty.",
	},
}

var landslideKind = kind{
	short: []string{
		"Mud and rocks blocking the hill road.",
		"Cracks appearing on the slope above houses.",
		"Small landslip near km marker, road narrowed.",
	},
	long: []string{
		"A section of the slope above the estate labour lines gave way this morning and soil has come down onto the back of two houses. No one is hurt but there are fresh cracks running along the hill and more mud is sliding with every spell of rain. The families are scared to stay tonight. The road to the main junction is also half blocked by a fallen tree and boulders, so vehicles cannot pass beyond the temple.",
	},
}

var treeKind = kind{
	short: []string{
		"Large tree down across the road.",
		"Electric post leaning after tree fall.",
		"Branch fell on parked vehicles.",
	},
	long: []string{
		"An old rain tree came down during the squall around 4pm and is lying across both lanes near the railway gate, taking an electric line down with it. Sparks were seen earlier so people are keeping away but there is no barricade and it is getting dark. Traffic from the bypass is diverting through the narrow colony road which is now jammed.",
	},
}

var fireKind = kind{
	short: []string{
		"Smoke from a shop shutter, no flames yet.",
		"Gas leak smell near the eatery row.",
		"Small fire in a waste dump, spreading.",
	},
	long: []string{},
}

var rescueKind = kind{
	short: []string{
		"Elderly man stranded on terrace.",
		"Two children cut off by rising water.",
		"Fishing boat not returned since morning.",
		"Person feeling unwell at the relief camp.",
	},
	long: []string{
		"A group of about eight labourers who were working at the riverside site are stranded on the raised platform there as the water came up very fast in the last hour. They are safe for now and we can see them but the current is strong and the temporary bridge they used has washed away. One of them is diabetic and has not eaten since morning. Requesting a rescue boat urgently before the level rises further tonight.",
	},
}

var shelterKind = kind{
	short: []string{
		"Relief camp near capacity, need bedding.",
		"Camp requesting drinking water and food.",
		"Where is the nearest open shelter?",
	},
	long: []string{},
}

var infraKind = kind{
	short: []string{
		"Dam shutters opened, warning downstream.",
		"Bridge railing damaged, unsafe for walking.",
		"Power out in the whole ward since evening.",
		"Sewage backing up into homes.",
	},
	long: []string{},
}

var allKinds = []kind{floodKind, landslideKind, treeKind, fireKind, rescueKind, shelterKind, infraKind}

func main() {
	ctx := context.Background()
	s, err := store.New(ctx)
	if err != nil {
		log.Fatalf("store init: %v", err)
	}

	rng := rand.New(rand.NewSource(42))
	now := time.Now().UTC()

	total := 0
	for _, d := range []district{ernakulam, kodagu} {
		responders := seedDistrict(ctx, s, rng, now, d)
		total += d.incidents
		seedResources(ctx, s, rng, now, d, responders)
	}

	fmt.Printf("\nSeed complete: %d incidents across 2 districts.\n\n", total)
	printCredentials()
}

// seedDistrict creates the staff + citizen accounts and the incident board for
// one district. It returns the responder user IDs so resources and assignments
// can reference real people.
func seedDistrict(ctx context.Context, s *store.Store, rng *rand.Rand, now time.Time, d district) []string {
	// Staff accounts with predictable demo logins.
	createUser(ctx, s, user{id: "seed-" + d.id + "-admin", name: "District Control", contact: "admin@" + d.id + ".test", role: models.RoleAdmin, district: d.id, created: now})
	createUser(ctx, s, user{id: "seed-" + d.id + "-coord", name: "Relief Desk", contact: "coord@" + d.id + ".test", role: models.RoleCoordinator, district: d.id, created: now})
	citizenDemo := "seed-" + d.id + "-citizen"
	createUser(ctx, s, user{id: citizenDemo, name: "Priya Menon", contact: "citizen@" + d.id + ".test", role: models.RoleCitizen, district: d.id, created: now})

	// A named pool of responders. The first one gets the demo login.
	var responders []string
	respNames := []string{"Field Team A", "Field Team B", "Fire & Rescue Unit", "Coastal Squad", "Medical Response", "Traffic Wing"}
	for i, name := range respNames {
		id := fmt.Sprintf("seed-%s-resp-%d", d.id, i)
		contact := fmt.Sprintf("responder+%d@%s.test", i, d.id)
		if i == 0 {
			contact = "responder@" + d.id + ".test"
		}
		createUser(ctx, s, user{id: id, name: name, contact: contact, role: models.RoleResponder, district: d.id, created: now})
		responders = append(responders, id)
	}

	// A pool of citizen reporters with real-sounding names.
	var citizens []string
	citizens = append(citizens, citizenDemo)
	for i := 0; i < 30; i++ {
		id := fmt.Sprintf("seed-%s-cit-%d", d.id, i)
		name := reporterFirst[rng.Intn(len(reporterFirst))] + " " + reporterLast[rng.Intn(len(reporterLast))]
		createUser(ctx, s, user{id: id, name: name, contact: fmt.Sprintf("cit+%d@%s.test", i, d.id), role: models.RoleCitizen, district: d.id, created: now})
		citizens = append(citizens, id)
	}

	created := 0
	for i := 0; i < d.incidents; i++ {
		inc := buildIncident(rng, now, d, i, citizens, responders)
		if err := s.CreateIncident(ctx, inc); err != nil {
			log.Printf("incident %s: %v", inc.IncidentID, err)
			continue
		}
		created++
	}
	fmt.Printf("%-10s  %3d incidents  %2d responders  %2d citizens\n", d.label, created, len(responders), len(citizens))
	return responders
}

// buildIncident assembles one incident with correlated, deliberately messy
// fields: rare criticals, older items skewed toward resolved, ~30% with no
// evidence, and a fraction with missing reporter or empty description.
func buildIncident(rng *rand.Rand, now time.Time, d district, i int, citizens, responders []string) models.Incident {
	severity := weightedSeverity(rng)
	age := reportAge(rng)
	reportedAt := now.Add(-age)

	status := correlatedStatus(rng, severity, age)

	// updatedAt advances past the report time once the incident has moved on.
	updatedAt := reportedAt
	switch status {
	case models.StatusAssigned, models.StatusInProgress:
		updatedAt = reportedAt.Add(time.Duration(rng.Intn(90)+5) * time.Minute)
	case models.StatusResolved:
		updatedAt = reportedAt.Add(time.Duration(rng.Intn(600)+30) * time.Minute)
	case models.StatusEscalated:
		updatedAt = reportedAt.Add(35 * time.Minute)
	}
	if updatedAt.After(now) {
		updatedAt = now
	}

	p := d.places[rng.Intn(len(d.places))]
	inc := models.Incident{
		DistrictID:  d.id,
		IncidentID:  fmt.Sprintf("seed-%s-%04d", d.id, i),
		Timestamp:   reportedAt.Format(time.RFC3339),
		UpdatedAt:   updatedAt.Format(time.RFC3339),
		Severity:    severity,
		Location:    buildLocation(rng, p),
		// Jitter off the town centre so pins spread across the map. Most
		// reports carry coordinates; ~12% don't (simulating denied GPS / SMS).
		Description: buildDescription(rng),
		Status:      status,
	}
	if rng.Float64() > 0.12 {
		inc.Lat = round5(p.lat + (rng.Float64()-0.5)*0.016)
		inc.Lng = round5(p.lng + (rng.Float64()-0.5)*0.016)
	}

	// Reporter: mostly a known citizen; ~14% reference a non-existent user so
	// the UI has to render an "Unknown" reporter (deleted / anonymous report).
	if rng.Float64() < 0.14 {
		inc.ReporterID = fmt.Sprintf("anon-%08x", rng.Uint32())
	} else {
		inc.ReporterID = citizens[rng.Intn(len(citizens))]
	}

	// Assignment: anything past "open" has a responder attached.
	if status != models.StatusOpen {
		inc.AssignedTo = responders[rng.Intn(len(responders))]
	}
	if status == models.StatusResolved {
		inc.ResolveNote = resolveNote(rng)
	}

	inc.EvidenceKeys = buildEvidence(rng, d.id, inc.IncidentID)
	return inc
}

// weightedSeverity: most reports are routine; criticals are rare.
// 1:32%  2:30%  3:22%  4:11%  5:5%
func weightedSeverity(rng *rand.Rand) int {
	r := rng.Float64()
	switch {
	case r < 0.32:
		return 1
	case r < 0.62:
		return 2
	case r < 0.84:
		return 3
	case r < 0.95:
		return 4
	default:
		return 5
	}
}

// reportAge spreads reports from seconds ago to ~3 weeks, skewed recent.
func reportAge(rng *rand.Rand) time.Duration {
	r := rng.Float64()
	switch {
	case r < 0.10: // last hour
		return time.Duration(rng.Intn(60)+1) * time.Minute
	case r < 0.35: // last day
		return time.Duration(rng.Intn(23)+1) * time.Hour
	case r < 0.70: // last week
		return time.Duration(rng.Intn(6)+1) * 24 * time.Hour
	default: // up to 3 weeks
		return time.Duration(rng.Intn(14)+7) * 24 * time.Hour
	}
}

// correlatedStatus keeps the board plausible: recent items skew open, older
// items skew resolved, escalation only happens to serious, unresolved reports.
func correlatedStatus(rng *rand.Rand, severity int, age time.Duration) string {
	r := rng.Float64()
	old := age > 3*24*time.Hour
	recent := age < 90*time.Minute

	if old {
		if r < 0.78 {
			return models.StatusResolved
		}
		if r < 0.90 {
			return models.StatusInProgress
		}
		return models.StatusAssigned
	}
	if recent {
		if severity >= 4 && r < 0.28 {
			return models.StatusEscalated
		}
		if r < 0.62 {
			return models.StatusOpen
		}
		if r < 0.85 {
			return models.StatusAssigned
		}
		return models.StatusInProgress
	}
	// mid-age
	switch {
	case severity >= 4 && r < 0.18:
		return models.StatusEscalated
	case r < 0.30:
		return models.StatusOpen
	case r < 0.55:
		return models.StatusAssigned
	case r < 0.78:
		return models.StatusInProgress
	default:
		return models.StatusResolved
	}
}

func round5(v float64) float64 {
	return math.Round(v*1e5) / 1e5
}

func buildLocation(rng *rand.Rand, p place) string {
	// Sometimes just the town, sometimes town + landmark, sometimes + ward.
	switch rng.Intn(3) {
	case 0:
		return p.town
	case 1:
		return fmt.Sprintf("%s — %s", p.town, p.landmarks[rng.Intn(len(p.landmarks))])
	default:
		return fmt.Sprintf("%s — %s, Ward %d", p.town, p.landmarks[rng.Intn(len(p.landmarks))], rng.Intn(24)+1)
	}
}

func buildDescription(rng *rand.Rand) string {
	r := rng.Float64()
	if r < 0.12 {
		return "" // missing description — a real skipped field
	}
	k := allKinds[rng.Intn(len(allKinds))]
	if r < 0.22 && len(k.long) > 0 {
		return k.long[rng.Intn(len(k.long))]
	}
	return k.short[rng.Intn(len(k.short))]
}

// buildEvidence: ~30% no image (skipped/failed upload); the rest have 1-3, and
// a few have many to stress list/detail overflow.
func buildEvidence(rng *rand.Rand, districtID, incidentID string) []string {
	r := rng.Float64()
	if r < 0.30 {
		return nil
	}
	n := 1
	switch {
	case r < 0.62:
		n = 1
	case r < 0.85:
		n = 2
	case r < 0.95:
		n = 3
	default:
		n = rng.Intn(4) + 5 // 5-8, overflow case
	}
	keys := make([]string, 0, n)
	for j := 0; j < n; j++ {
		ext := "jpg"
		if j == 2 && rng.Float64() < 0.4 {
			ext = "pdf" // a document mixed in with photos
		}
		keys = append(keys, fmt.Sprintf("evidence/%s/%s/%d-photo.%s", districtID, incidentID, j, ext))
	}
	return keys
}

var resolveNotes = []string{
	"Water receded by evening, families back home. Camp stood down.",
	"Cleared with JCB, road reopened to traffic.",
	"Rescued all stranded, moved to relief camp at the school.",
	"KSEB restored the line, area powered.",
	"Barricaded the spot and informed PWD for permanent repair.",
	"False alarm on inspection, no action needed.",
	"Tree cut and removed, line restored by evening.",
}

func resolveNote(rng *rand.Rand) string {
	if rng.Float64() < 0.2 {
		return "" // resolved without a note — common in practice
	}
	return resolveNotes[rng.Intn(len(resolveNotes))]
}

// seedResources gives each district a small, mixed inventory.
func seedResources(ctx context.Context, s *store.Store, rng *rand.Rand, now time.Time, d district, _ []string) {
	coordinator := "seed-" + d.id + "-coord"
	types := []struct {
		t   string
		cap int
	}{
		{"rescue_boat", 8}, {"rescue_boat", 6}, {"vehicle", 12}, {"vehicle", 20},
		{"shelter", 150}, {"shelter", 80}, {"medical", 4}, {"food", 500},
		{"water", 2000}, {"generator", 2},
	}
	avail := []string{models.ResourceAvailable, models.ResourceAvailable, models.ResourceAssigned, models.ResourceDepleted, models.ResourceOffline}
	for i, rt := range types {
		res := models.Resource{
			DistrictID:    d.id,
			ResourceID:    fmt.Sprintf("seed-%s-res-%02d", d.id, i),
			Type:          rt.t,
			Capacity:      rt.cap,
			Availability:  avail[rng.Intn(len(avail))],
			CoordinatorID: coordinator,
			CreatedAt:     now.Add(-time.Duration(rng.Intn(30)+1) * 24 * time.Hour).Format(time.RFC3339),
		}
		if err := s.CreateResource(ctx, res); err != nil {
			log.Printf("resource %s: %v", res.ResourceID, err)
		}
	}
}

// user is a small local shape for createUser.
type user struct {
	id       string
	name     string
	contact  string
	role     string
	district string
	created  time.Time
}

func createUser(ctx context.Context, s *store.Store, u user) {
	hash, err := auth.HashPassword(demoPassword)
	if err != nil {
		log.Fatalf("hash: %v", err)
	}
	err = s.CreateUser(ctx, models.User{
		UserID:       u.id,
		Name:         u.name,
		Contact:      u.contact,
		PasswordHash: hash,
		Role:         u.role,
		DistrictID:   u.district,
		CreatedAt:    u.created.Format(time.RFC3339),
	})
	if err != nil && !errors.Is(err, store.ErrAlreadyExists) {
		log.Printf("user %s: %v", u.contact, err)
	}
}

func printCredentials() {
	fmt.Println("Demo logins (password for all:", demoPassword+")")
	fmt.Println("  Ernakulam — full board & assignment")
	fmt.Println("    admin@ernakulam.test        District Admin   (sees every report, can assign & resolve)")
	fmt.Println("    coord@ernakulam.test        Coordinator      (resources + read-only incidents)")
	fmt.Println("    responder@ernakulam.test    Responder        (only reports assigned to them)")
	fmt.Println("    citizen@ernakulam.test      Citizen          (report + track)")
	fmt.Println("  Kodagu — second district")
	fmt.Println("    admin@kodagu.test           District Admin")
	fmt.Println()
}
