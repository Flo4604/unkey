package vault

import (
	"context"

	vaultv1 "github.com/unkeyed/unkey/go/gen/proto/vault/v1"
	"github.com/unkeyed/unkey/go/pkg/otel/tracing"
)

func (s *Service) CreateDEK(ctx context.Context, req *vaultv1.CreateDEKRequest) (*vaultv1.CreateDEKResponse, error) {
	ctx, span := tracing.Start(ctx, "vault.CreateDEK")
	defer span.End()

	key, err := s.keyring.CreateKey(ctx, req.GetKeyring())
	if err != nil {
		return nil, err
	}
	return &vaultv1.CreateDEKResponse{
		KeyId: key.GetId(),
	}, nil
}
