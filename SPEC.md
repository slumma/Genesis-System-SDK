# Genesis SDK Specification

> The canonical specification for components and blueprints

**Version:** 1.0.0  
**Status:** Active  
**Last Updated:** December 13, 2025

---

## Overview

This document defines the standard format for Genesis SDK artifacts. All components and blueprints MUST conform to this specification to ensure AI agents can reliably consume and compose them.

---

## Component Specification

### File: `component.yaml`

Every component directory MUST contain a `component.yaml` file.

```yaml
# Required metadata
apiVersion: genesis.ai/v1
kind: Component
metadata:
  name: string           # Unique identifier (lowercase, hyphenated)
  version: string        # Semantic version (e.g., "1.0.0")
  category: enum         # See categories below
  tags: [string]         # Searchable tags

# Component specification
spec:
  # Human-readable description
  description: string
  
  # Dependencies on other components
  dependencies:
    required:
      - name: string
        version: string   # SemVer range (e.g., ">=1.0.0")
        reason: string    # Why it's needed
    optional:
      - name: string
        version: string
        reason: string
  
  # Configuration schema
  config:
    ports:
      default: number
      admin: number       # Optional
      metrics: number     # Optional
    
    environment:
      required:
        - name: string
          description: string
          sensitive: boolean  # Should be hidden in logs
      optional:
        - name: string
          description: string
          default: string | number | boolean
  
  # Docker Compose snippet
  docker_compose:
    service_name:
      image: string
      environment: {...}
      ports: [...]
      volumes: [...]
      depends_on: [...]
      healthcheck: {...}
  
  # Code patterns for integration
  patterns:
    python: |
      # Example Python code
    typescript: |
      # Example TypeScript code
    docker: |
      # Dockerfile snippet
  
  # Step-by-step guide for AI agents
  implementation_instructions: |
    ## For AI Implementation Agents
    ...
  
  # Validation tests
  tests:
    smoke:
      - name: string
        command: string
        expected: string
    integration:
      - name: string
        steps: [string]
```

### Categories

Components MUST use one of these categories:

| Category | Description |
|----------|-------------|
| `backend` | API services, business logic |
| `frontend` | User interfaces |
| `identity` | Authentication, authorization |
| `infrastructure` | Databases, caches, storage |
| `workflow` | Orchestration, scheduling |
| `observability` | Logging, tracing, monitoring |
| `ai` | LLM integration, ML services |

---

## Blueprint Specification

### File: `blueprint.yaml`

Every blueprint directory MUST contain a `blueprint.yaml` file.

```yaml
# Required metadata
apiVersion: genesis.ai/v1
kind: Blueprint
metadata:
  name: string           # Unique identifier
  version: string        # Semantic version
  description: string    # What this blueprint creates

# Blueprint specification
spec:
  # Components included
  components:
    - name: string       # Component name from catalog
      version: string    # Version constraint
      alias: string      # Optional service name override
      config: {...}      # Component-specific config
  
  # How components connect
  wiring:
    - from: string       # Source component
      to: string         # Target component
      via: string        # Connection type (http, grpc, tcp, env)
      config: {...}
  
  # Default values
  defaults:
    environment:
      - name: string
        value: string | number | boolean
  
  # Optional variations
  variants:
    - name: string
      description: string
      adds: [string]     # Additional components
      removes: [string]  # Components to exclude
      overrides: {...}   # Config overrides
  
  # Docker Compose output
  docker_compose:
    name: string
    services: {...}      # Generated from components
    volumes: {...}
    networks: {...}
```

---

## Directory Structure

### Component Directory

```
components/{component-name}/
├── component.yaml       # Required: Component contract
├── README.md            # Optional: Human documentation
├── templates/           # Optional: Config templates
│   ├── Dockerfile
│   ├── config.yaml
│   └── ...
└── tests/               # Optional: Test fixtures
    ├── smoke.sh
    └── ...
```

### Blueprint Directory

```
blueprints/{blueprint-name}/
├── blueprint.yaml       # Required: Blueprint definition
├── README.md            # Optional: Human documentation
├── docker-compose.yml   # Generated/Ready-to-use
├── .env.example         # Environment template
└── config/              # Optional: Shared config
    └── ...
```

---

## Naming Conventions

| Type | Convention | Example |
|------|------------|---------|
| Component name | lowercase-hyphenated | `fastapi-ai-service` |
| Blueprint name | lowercase-hyphenated | `ai-webapp` |
| Environment vars | SCREAMING_SNAKE | `DATABASE_URL` |
| Service names | lowercase-hyphenated | `backend-api` |
| Port variables | *_PORT suffix | `API_PORT` |

---

## Versioning

All artifacts use [Semantic Versioning](https://semver.org/):

- **MAJOR** - Breaking changes to the contract
- **MINOR** - New features, backward compatible
- **PATCH** - Bug fixes, backward compatible

Version constraints use standard ranges:
- `1.0.0` - Exact version
- `>=1.0.0` - Minimum version
- `>=1.0.0 <2.0.0` - Range
- `^1.0.0` - Compatible with 1.x.x
- `~1.0.0` - Approximately 1.0.x

---

## Validation

Components and blueprints can be validated against JSON schemas:

```bash
# Validate a component
genesis validate component.yaml

# Validate a blueprint
genesis validate blueprint.yaml
```

JSON schemas are provided in `/schemas/`:
- `component.schema.json`
- `blueprint.schema.json`

---

## Extension Points

### Custom Properties

Components MAY include custom properties under the `x-` prefix:

```yaml
spec:
  x-aws:
    service: ECS
    cpu: 256
    memory: 512
```

### Provider-Specific Config

Blueprints MAY include provider-specific deployment config:

```yaml
spec:
  x-aws:
    region: us-east-1
    ecs_cluster: production
  x-kubernetes:
    namespace: genesis
```

---

## Examples

### Minimal Component

```yaml
apiVersion: genesis.ai/v1
kind: Component
metadata:
  name: hello-world
  version: 1.0.0
  category: backend

spec:
  description: A simple hello world service
  
  config:
    ports:
      default: 8080
  
  docker_compose:
    hello:
      image: nginx:alpine
      ports:
        - "8080:80"
```

### Minimal Blueprint

```yaml
apiVersion: genesis.ai/v1
kind: Blueprint
metadata:
  name: simple-api
  version: 1.0.0
  description: Simple API with database

spec:
  components:
    - name: fastapi-ai-service
      version: ^1.0.0
    - name: postgres
      version: ^1.0.0
  
  wiring:
    - from: fastapi-ai-service
      to: postgres
      via: tcp
```

---

## Changelog

### 1.0.0 (December 2025)
- Initial specification release
- Component and Blueprint definitions
- Validation schema

---

*This specification is part of the Genesis System SDK.*
