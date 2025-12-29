# Postman / Newman

- Collection: `postman/HollyShip.postman_collection.json`
- Environment: `postman/HollyShip.postman_environment.json`

## Run via Newman

From repo root:

- `npm run test:api`

## Notes

- The email verification endpoint returns a demo code in development; in Postman, run **Auth - Email Start** first, then paste the returned code into **Auth - Email Verify** (request body).
- The collection stores `token` + `shipmentId` into environment variables.
