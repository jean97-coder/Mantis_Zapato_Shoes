# JC SHOE'S ERP

Sistema de gestión integral (ERP) para talleres de restauración y reparación de calzado. Incluye dashboard ejecutivo, órdenes de trabajo, diagnóstico técnico, fotos antes/después, presupuestos, abonos y notas de venta, inventario de insumos, caja, CRM de clientes, notificaciones por WhatsApp y control de acceso por roles (RBAC).

## Arquitectura

- **Frontend**: React 19 + TypeScript + Vite + Tailwind CSS v4 (`src/`)
- **Backend**: Node.js + Express + TypeScript (`server/`)
- **Base de datos**: PostgreSQL vía Prisma ORM (`Mantis_zapatos_db`)
- **Autenticación**: JWT con una única credencial estática de administrador (no editable ni eliminable desde la base de datos o la interfaz)

## Requisitos

- Node.js 20+
- PostgreSQL corriendo en `localhost:5432` con la base `Mantis_zapatos_db` ya creada

## Configuración inicial

```bash
# 1. Instalar dependencias del frontend
npm install

# 2. Instalar dependencias del backend
npm run server:install

# 3. Sincronizar el esquema de Prisma con la base de datos
cd server && npx prisma db push && cd ..

# 4. Poblar datos iniciales (usuarios, clientes, catálogo, órdenes de ejemplo)
npm run server:seed
```

Las credenciales de conexión están en `server/.env` (`DATABASE_URL`). Ajusta usuario/contraseña si tu instancia de Postgres es distinta.

## Ejecutar en desarrollo

```bash
# Levanta frontend (puerto 3000) y backend (puerto 4310) juntos
npm run dev:all
```

O por separado:

```bash
npm run dev          # frontend
npm run server:dev   # backend
```

Abre `http://localhost:3000`.

## Acceso al sistema

El login usa una única credencial estática de administrador total, definida directamente en `server/src/routes/auth.routes.ts` (no depende de la base de datos, por lo que no se puede editar ni eliminar desde ahí ni desde la interfaz):

| Usuario        | Contraseña  |
|----------------|-------------|
| `shoesjc2026`  | `shoes2026` |

Los registros de personal (cajeros, zapateros, socios) en Configuración > Personal & Roles siguen existiendo para asignación de técnicos y trazabilidad, pero ya no se usan para iniciar sesión.

## Estructura del proyecto

```
src/                  Frontend (React + Vite)
  components/         Vistas y modales por módulo
  context/            AuthContext y AppContext (estado global + API)
  lib/api.ts          Cliente HTTP hacia el backend
server/
  src/routes/         Endpoints REST por módulo
  src/lib/            Prisma client, auth, serializadores
  prisma/schema.prisma Modelo de datos completo
  prisma/seed.ts      Datos iniciales
```

## Scripts útiles

- `npm run lint` — chequeo de tipos del frontend
- `npm run build` — build de producción del frontend
- `npm --prefix server run prisma:studio` — explorar la base de datos visualmente
