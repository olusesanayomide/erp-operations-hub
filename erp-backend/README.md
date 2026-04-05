# ERP Backend (Inventory-Ledger Architecture)

A robust ERP backend built with **NestJS, Prisma, and PostgreSQL**. Unlike basic CRUD apps, this system uses a **ledger-based inventory engine** where stock is never edited—it is only moved.

##  Recent Updates

* **Authentication & Security:** Implemented Global JWT Authentication with `Passport.js`.
* **RBAC (Role-Based Access Control):** Added a custom `@Roles()` decorator system (Admin, Manager, Staff) to protect sensitive procurement and financial routes.
* **Standardized Error Handling:** Refined Guards to return proper HTTP exceptions (`401 Unauthorized`, `403 Forbidden`) instead of generic server errors.
* **Full Procurement Cycle:** Implemented Purchase Orders with automated stock-in on receipt.
* **MDM (Master Data Management):** Added registry modules for Customers, Suppliers, and Warehouses.

---

##  Core Architecture: The "Ledger" Principle

The system follows a strict **Event Sourcing** mindset for physical goods:

1. **Stock never changes directly:** You cannot manually "set" stock to 50.
2. **The Ledger:** All changes are immutable records in the `StockMovement` table.
3. **Current Balance:** `InventoryItem` provides a calculated snapshot based on the sum of movements.
4. **Audit Trail:** Every single unit of stock can be traced back to a specific Purchase Order, Sales Order, or manual Adjustment.

---

##  Security & Roles

The API is locked by default. Access requires a valid JWT Bearer Token.

| Role | Permissions |
| --- | --- |
| **Admin** | Full system access, User management, and System Configuration. |
| **Manager** | Procurement approval, Inventory adjustments, and Sales management. |
| **Staff** | View inventory, Create draft orders, and Receive shipments. |

**Usage:**

```typescript
@Roles(Role.ADMIN)
@Delete(':id')
remove(@Param('id') id: string) { ... }

```

---

##  Project Modules

### Master Data (The Registry)

* **Products:** The central catalog of SKUs and descriptions.
* **Warehouses:** Physical storage locations with address tracking.
* **Customers & Suppliers:** Registry for CRM and Procurement.

### Transactions (The Flow)

* **Purchases (Inbound):** `PO Created` → `Received` → `Positive Stock Movement`.
* **Orders (Outbound):** `Order Created` → `Shipped` → `Negative Stock Movement`.
* **Inventory:** The engine that calculates balances and logs manual adjustments.

---

## 🛠️ Tech Stack

* **Framework:** NestJS (Node.js)
* **Database:** PostgreSQL + Prisma ORM
* **Security:** Passport-JWT + Bcrypt
* **Validation:** Class-validator & ParseUUIDPipes
* **Docs:** Swagger (OpenAPI 3.0)

---

##  Getting Started

1. **Environment Setup:** Create a `.env` file with `DATABASE_URL` and `JWT_SECRET`.
2. **Install:** `npm install`
3. **Database:** `npx prisma migrate dev`
4. **Run:** `npm run start:dev`
5. **Docs:** Visit `http://localhost:3000/api`

---

##  Roadmap

* [x] Core Ledger Logic
* [x] Sales & Procurement Integration
* [x] JWT Authentication & Global Guards
* [x] Role-Based Access Control (RBAC)
* [ ] **Next:** Multi-Warehouse Stock Transfers
* [ ] **Future:** PDF Invoice Generation & Valuation Reports (FIFO/LIFO)
