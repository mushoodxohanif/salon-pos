import { relations } from "drizzle-orm";
import {
  boolean,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

export const authTypeEnum = pgEnum("auth_type", ["pin", "password"]);
export const employeeRoleEnum = pgEnum("employee_role", ["employee", "admin"]);

export const branches = pgTable("branches", {
  id: uuid("id").primaryKey().defaultRandom(),
  nameEn: text("name_en").notNull(),
  nameAr: text("name_ar").notNull(),
  address: text("address"),
  phone: text("phone"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const employees = pgTable("employees", {
  id: uuid("id").primaryKey().defaultRandom(),
  branchId: uuid("branch_id")
    .notNull()
    .references(() => branches.id),
  name: text("name").notNull(),
  authType: authTypeEnum("auth_type").notNull(),
  username: text("username").unique(),
  pinHash: text("pin_hash"),
  passwordHash: text("password_hash"),
  isActive: boolean("is_active").notNull().default(true),
  role: employeeRoleEnum("role").notNull().default("employee"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const serviceCategories = pgTable("service_categories", {
  id: uuid("id").primaryKey().defaultRandom(),
  nameEn: text("name_en").notNull(),
  nameAr: text("name_ar").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
});

export type PriceTier = {
  label: string;
  amount: number;
};

export const services = pgTable("services", {
  id: uuid("id").primaryKey().defaultRandom(),
  categoryId: uuid("category_id")
    .notNull()
    .references(() => serviceCategories.id),
  nameEn: text("name_en").notNull(),
  nameAr: text("name_ar").notNull(),
  priceTiers: jsonb("price_tiers").$type<PriceTier[]>().notNull().default([]),
  isActive: boolean("is_active").notNull().default(true),
});

export const sales = pgTable("sales", {
  id: uuid("id").primaryKey().defaultRandom(),
  branchId: uuid("branch_id")
    .notNull()
    .references(() => branches.id),
  employeeId: uuid("employee_id")
    .notNull()
    .references(() => employees.id),
  saleCode: text("sale_code").notNull().unique(),
  customerName: text("customer_name"),
  customerPhone: text("customer_phone"),
  discountAmount: numeric("discount_amount", { precision: 10, scale: 3 }).notNull().default("0"),
  total: numeric("total", { precision: 10, scale: 3 }).notNull(),
  currency: text("currency").notNull().default("OMR"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const attendanceSessions = pgTable("attendance_sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  employeeId: uuid("employee_id")
    .notNull()
    .references(() => employees.id),
  branchId: uuid("branch_id")
    .notNull()
    .references(() => branches.id),
  checkedInAt: timestamp("checked_in_at", { withTimezone: true }).notNull(),
  checkedOutAt: timestamp("checked_out_at", { withTimezone: true }),
});

export const saleItems = pgTable("sale_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  saleId: uuid("sale_id")
    .notNull()
    .references(() => sales.id),
  serviceId: uuid("service_id")
    .notNull()
    .references(() => services.id),
  unitPrice: numeric("unit_price", { precision: 10, scale: 3 }).notNull(),
  priceLabel: text("price_label"),
});

export const expenses = pgTable("expenses", {
  id: uuid("id").primaryKey().defaultRandom(),
  branchId: uuid("branch_id")
    .notNull()
    .references(() => branches.id),
  employeeId: uuid("employee_id")
    .notNull()
    .references(() => employees.id),
  amount: numeric("amount", { precision: 10, scale: 3 }).notNull(),
  category: text("category").notNull(),
  note: text("note"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const branchesRelations = relations(branches, ({ many }) => ({
  employees: many(employees),
  sales: many(sales),
  expenses: many(expenses),
  attendanceSessions: many(attendanceSessions),
}));

export const employeesRelations = relations(employees, ({ one, many }) => ({
  branch: one(branches, {
    fields: [employees.branchId],
    references: [branches.id],
  }),
  sales: many(sales),
  expenses: many(expenses),
  attendanceSessions: many(attendanceSessions),
}));

export const serviceCategoriesRelations = relations(serviceCategories, ({ many }) => ({
  services: many(services),
}));

export const servicesRelations = relations(services, ({ one, many }) => ({
  category: one(serviceCategories, {
    fields: [services.categoryId],
    references: [serviceCategories.id],
  }),
  saleItems: many(saleItems),
}));

export const salesRelations = relations(sales, ({ one, many }) => ({
  branch: one(branches, {
    fields: [sales.branchId],
    references: [branches.id],
  }),
  employee: one(employees, {
    fields: [sales.employeeId],
    references: [employees.id],
  }),
  items: many(saleItems),
}));

export const saleItemsRelations = relations(saleItems, ({ one }) => ({
  sale: one(sales, {
    fields: [saleItems.saleId],
    references: [sales.id],
  }),
  service: one(services, {
    fields: [saleItems.serviceId],
    references: [services.id],
  }),
}));

export const expensesRelations = relations(expenses, ({ one }) => ({
  branch: one(branches, {
    fields: [expenses.branchId],
    references: [branches.id],
  }),
  employee: one(employees, {
    fields: [expenses.employeeId],
    references: [employees.id],
  }),
}));

export const attendanceSessionsRelations = relations(attendanceSessions, ({ one }) => ({
  employee: one(employees, {
    fields: [attendanceSessions.employeeId],
    references: [employees.id],
  }),
  branch: one(branches, {
    fields: [attendanceSessions.branchId],
    references: [branches.id],
  }),
}));

export type Branch = typeof branches.$inferSelect;
export type NewBranch = typeof branches.$inferInsert;
export type Employee = typeof employees.$inferSelect;
export type NewEmployee = typeof employees.$inferInsert;
export type ServiceCategory = typeof serviceCategories.$inferSelect;
export type NewServiceCategory = typeof serviceCategories.$inferInsert;
export type Service = typeof services.$inferSelect;
export type NewService = typeof services.$inferInsert;
export type Sale = typeof sales.$inferSelect;
export type NewSale = typeof sales.$inferInsert;
export type SaleItem = typeof saleItems.$inferSelect;
export type NewSaleItem = typeof saleItems.$inferInsert;
export type Expense = typeof expenses.$inferSelect;
export type NewExpense = typeof expenses.$inferInsert;
export type AttendanceSession = typeof attendanceSessions.$inferSelect;
export type NewAttendanceSession = typeof attendanceSessions.$inferInsert;
