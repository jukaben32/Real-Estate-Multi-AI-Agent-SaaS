import { z } from "zod";

export const createPropertySchema = z.object({
  title: z.string().min(3),
  description: z.string().optional(),
  propertyType: z.enum(["RESIDENTIAL", "COMMERCIAL", "APARTMENT", "TOWNHOUSE", "LAND"]).default("RESIDENTIAL"),
  listingType: z.enum(["SALE", "RENT"]),
  price: z.number().positive(),
  priceType: z.enum(["FIXED", "MONTHLY"]).default("FIXED"),
  bedrooms: z.number().int().min(0).default(0),
  bathrooms: z.number().int().min(0).default(0),
  areaSqft: z.number().positive().optional(),
  parkingSpaces: z.number().int().min(0).default(0),
  yearBuilt: z.number().int().optional(),
  addressLine: z.string().min(3),
  city: z.string().optional(),
  region: z.string().optional(),
  postalCode: z.string().optional(),
  country: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  amenities: z.array(z.string()).default([]),
  images: z.array(z.string().url()).default([]),
  visibleToAiAgent: z.boolean().default(true),
  featured: z.boolean().default(false),
  aiAgentId: z.string().uuid().optional(),
});

export const updatePropertySchema = createPropertySchema.partial();

export const updateStatusSchema = z.object({
  status: z.enum(["AVAILABLE", "PENDING", "SOLD", "RENTED", "WITHDRAWN"]),
});

export const listPropertiesQuerySchema = z.object({
  status: z.enum(["AVAILABLE", "PENDING", "SOLD", "RENTED", "WITHDRAWN"]).optional(),
  listingType: z.enum(["SALE", "RENT"]).optional(),
  propertyType: z.enum(["RESIDENTIAL", "COMMERCIAL", "APARTMENT", "TOWNHOUSE", "LAND"]).optional(),
  minPrice: z.coerce.number().optional(),
  maxPrice: z.coerce.number().optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});
