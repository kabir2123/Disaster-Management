package auth_test

import (
	"testing"
	"time"

	"github.com/kabirpanda/resq/internal/auth"
)

func TestPasswordAndJWT(t *testing.T) {
	hash, err := auth.HashPassword("secret123")
	if err != nil {
		t.Fatal(err)
	}
	if auth.CheckPassword(hash, "secret123") != nil {
		t.Fatal("password should match")
	}
	if auth.CheckPassword(hash, "wrong") == nil {
		t.Fatal("wrong password should fail")
	}

	secret := []byte("test-secret")
	token, err := auth.CreateToken(secret, "user-1", "admin", "district-a", time.Hour)
	if err != nil {
		t.Fatal(err)
	}
	claims, err := auth.ParseToken(secret, token)
	if err != nil {
		t.Fatal(err)
	}
	if claims.UserID != "user-1" || claims.Role != "admin" || claims.DistrictID != "district-a" {
		t.Fatalf("unexpected claims: %+v", claims)
	}
}
