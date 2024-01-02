import { z } from 'zod';
import type { Prisma } from '@prisma/client';

/////////////////////////////////////////
// HELPER FUNCTIONS
/////////////////////////////////////////


/////////////////////////////////////////
// ENUMS
/////////////////////////////////////////

export const UsersScalarFieldEnumSchema = z.enum(['id','claims','email','password','username']);

export const SortOrderSchema = z.enum(['asc','desc']);

export const QueryModeSchema = z.enum(['default','insensitive']);
/////////////////////////////////////////
// MODELS
/////////////////////////////////////////

/////////////////////////////////////////
// USERS SCHEMA
/////////////////////////////////////////

export const UsersSchema = z.object({
  id: z.string(),
  claims: z.string().array(),
  email: z.string(),
  password: z.string(),
  username: z.string(),
})

export type Users = z.infer<typeof UsersSchema>

/////////////////////////////////////////
// MONGODB TYPES
/////////////////////////////////////////

/////////////////////////////////////////
// SELECT & INCLUDE
/////////////////////////////////////////

// USERS
//------------------------------------------------------

export const UsersArgsSchema: z.ZodType<Prisma.UsersDefaultArgs> = z.object({
  select: z.lazy(() => UsersSelectSchema).optional(),
}).strict();

export const UsersSelectSchema: z.ZodType<Prisma.UsersSelect> = z.object({
  id: z.boolean().optional(),
  claims: z.boolean().optional(),
  email: z.boolean().optional(),
  password: z.boolean().optional(),
  username: z.boolean().optional(),
}).strict()


/////////////////////////////////////////
// INPUT TYPES
/////////////////////////////////////////

export const UsersWhereInputSchema: z.ZodType<Prisma.UsersWhereInput> = z.object({
  AND: z.union([ z.lazy(() => UsersWhereInputSchema),z.lazy(() => UsersWhereInputSchema).array() ]).optional(),
  OR: z.lazy(() => UsersWhereInputSchema).array().optional(),
  NOT: z.union([ z.lazy(() => UsersWhereInputSchema),z.lazy(() => UsersWhereInputSchema).array() ]).optional(),
  id: z.union([ z.lazy(() => StringFilterSchema),z.string() ]).optional(),
  claims: z.lazy(() => StringNullableListFilterSchema).optional(),
  email: z.union([ z.lazy(() => StringFilterSchema),z.string() ]).optional(),
  password: z.union([ z.lazy(() => StringFilterSchema),z.string() ]).optional(),
  username: z.union([ z.lazy(() => StringFilterSchema),z.string() ]).optional(),
}).strict();

export const UsersOrderByWithRelationInputSchema: z.ZodType<Prisma.UsersOrderByWithRelationInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  claims: z.lazy(() => SortOrderSchema).optional(),
  email: z.lazy(() => SortOrderSchema).optional(),
  password: z.lazy(() => SortOrderSchema).optional(),
  username: z.lazy(() => SortOrderSchema).optional()
}).strict();

export const UsersWhereUniqueInputSchema: z.ZodType<Prisma.UsersWhereUniqueInput> = z.union([
  z.object({
    id: z.string(),
    email: z.string(),
    username: z.string()
  }),
  z.object({
    id: z.string(),
    email: z.string(),
  }),
  z.object({
    id: z.string(),
    username: z.string(),
  }),
  z.object({
    id: z.string(),
  }),
  z.object({
    email: z.string(),
    username: z.string(),
  }),
  z.object({
    email: z.string(),
  }),
  z.object({
    username: z.string(),
  }),
])
.and(z.object({
  id: z.string().optional(),
  email: z.string().optional(),
  username: z.string().optional(),
  AND: z.union([ z.lazy(() => UsersWhereInputSchema),z.lazy(() => UsersWhereInputSchema).array() ]).optional(),
  OR: z.lazy(() => UsersWhereInputSchema).array().optional(),
  NOT: z.union([ z.lazy(() => UsersWhereInputSchema),z.lazy(() => UsersWhereInputSchema).array() ]).optional(),
  claims: z.lazy(() => StringNullableListFilterSchema).optional(),
  password: z.union([ z.lazy(() => StringFilterSchema),z.string() ]).optional(),
}).strict());

export const UsersOrderByWithAggregationInputSchema: z.ZodType<Prisma.UsersOrderByWithAggregationInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  claims: z.lazy(() => SortOrderSchema).optional(),
  email: z.lazy(() => SortOrderSchema).optional(),
  password: z.lazy(() => SortOrderSchema).optional(),
  username: z.lazy(() => SortOrderSchema).optional(),
  _count: z.lazy(() => UsersCountOrderByAggregateInputSchema).optional(),
  _max: z.lazy(() => UsersMaxOrderByAggregateInputSchema).optional(),
  _min: z.lazy(() => UsersMinOrderByAggregateInputSchema).optional()
}).strict();

export const UsersScalarWhereWithAggregatesInputSchema: z.ZodType<Prisma.UsersScalarWhereWithAggregatesInput> = z.object({
  AND: z.union([ z.lazy(() => UsersScalarWhereWithAggregatesInputSchema),z.lazy(() => UsersScalarWhereWithAggregatesInputSchema).array() ]).optional(),
  OR: z.lazy(() => UsersScalarWhereWithAggregatesInputSchema).array().optional(),
  NOT: z.union([ z.lazy(() => UsersScalarWhereWithAggregatesInputSchema),z.lazy(() => UsersScalarWhereWithAggregatesInputSchema).array() ]).optional(),
  id: z.union([ z.lazy(() => StringWithAggregatesFilterSchema),z.string() ]).optional(),
  claims: z.lazy(() => StringNullableListFilterSchema).optional(),
  email: z.union([ z.lazy(() => StringWithAggregatesFilterSchema),z.string() ]).optional(),
  password: z.union([ z.lazy(() => StringWithAggregatesFilterSchema),z.string() ]).optional(),
  username: z.union([ z.lazy(() => StringWithAggregatesFilterSchema),z.string() ]).optional(),
}).strict();

export const UsersCreateInputSchema: z.ZodType<Prisma.UsersCreateInput> = z.object({
  id: z.string().optional(),
  claims: z.union([ z.lazy(() => UsersCreateclaimsInputSchema),z.string().array() ]).optional(),
  email: z.string(),
  password: z.string(),
  username: z.string()
}).strict();

export const UsersUncheckedCreateInputSchema: z.ZodType<Prisma.UsersUncheckedCreateInput> = z.object({
  id: z.string().optional(),
  claims: z.union([ z.lazy(() => UsersCreateclaimsInputSchema),z.string().array() ]).optional(),
  email: z.string(),
  password: z.string(),
  username: z.string()
}).strict();

export const UsersUpdateInputSchema: z.ZodType<Prisma.UsersUpdateInput> = z.object({
  claims: z.union([ z.lazy(() => UsersUpdateclaimsInputSchema),z.string().array() ]).optional(),
  email: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  password: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  username: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
}).strict();

export const UsersUncheckedUpdateInputSchema: z.ZodType<Prisma.UsersUncheckedUpdateInput> = z.object({
  claims: z.union([ z.lazy(() => UsersUpdateclaimsInputSchema),z.string().array() ]).optional(),
  email: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  password: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  username: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
}).strict();

export const UsersCreateManyInputSchema: z.ZodType<Prisma.UsersCreateManyInput> = z.object({
  id: z.string().optional(),
  claims: z.union([ z.lazy(() => UsersCreateclaimsInputSchema),z.string().array() ]).optional(),
  email: z.string(),
  password: z.string(),
  username: z.string()
}).strict();

export const UsersUpdateManyMutationInputSchema: z.ZodType<Prisma.UsersUpdateManyMutationInput> = z.object({
  claims: z.union([ z.lazy(() => UsersUpdateclaimsInputSchema),z.string().array() ]).optional(),
  email: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  password: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  username: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
}).strict();

export const UsersUncheckedUpdateManyInputSchema: z.ZodType<Prisma.UsersUncheckedUpdateManyInput> = z.object({
  claims: z.union([ z.lazy(() => UsersUpdateclaimsInputSchema),z.string().array() ]).optional(),
  email: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  password: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  username: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
}).strict();

export const StringFilterSchema: z.ZodType<Prisma.StringFilter> = z.object({
  equals: z.string().optional(),
  in: z.string().array().optional(),
  notIn: z.string().array().optional(),
  lt: z.string().optional(),
  lte: z.string().optional(),
  gt: z.string().optional(),
  gte: z.string().optional(),
  contains: z.string().optional(),
  startsWith: z.string().optional(),
  endsWith: z.string().optional(),
  mode: z.lazy(() => QueryModeSchema).optional(),
  not: z.union([ z.string(),z.lazy(() => NestedStringFilterSchema) ]).optional(),
}).strict();

export const StringNullableListFilterSchema: z.ZodType<Prisma.StringNullableListFilter> = z.object({
  equals: z.string().array().optional().nullable(),
  has: z.string().optional().nullable(),
  hasEvery: z.string().array().optional(),
  hasSome: z.string().array().optional(),
  isEmpty: z.boolean().optional()
}).strict();

export const UsersCountOrderByAggregateInputSchema: z.ZodType<Prisma.UsersCountOrderByAggregateInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  claims: z.lazy(() => SortOrderSchema).optional(),
  email: z.lazy(() => SortOrderSchema).optional(),
  password: z.lazy(() => SortOrderSchema).optional(),
  username: z.lazy(() => SortOrderSchema).optional()
}).strict();

export const UsersMaxOrderByAggregateInputSchema: z.ZodType<Prisma.UsersMaxOrderByAggregateInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  email: z.lazy(() => SortOrderSchema).optional(),
  password: z.lazy(() => SortOrderSchema).optional(),
  username: z.lazy(() => SortOrderSchema).optional()
}).strict();

export const UsersMinOrderByAggregateInputSchema: z.ZodType<Prisma.UsersMinOrderByAggregateInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  email: z.lazy(() => SortOrderSchema).optional(),
  password: z.lazy(() => SortOrderSchema).optional(),
  username: z.lazy(() => SortOrderSchema).optional()
}).strict();

export const StringWithAggregatesFilterSchema: z.ZodType<Prisma.StringWithAggregatesFilter> = z.object({
  equals: z.string().optional(),
  in: z.string().array().optional(),
  notIn: z.string().array().optional(),
  lt: z.string().optional(),
  lte: z.string().optional(),
  gt: z.string().optional(),
  gte: z.string().optional(),
  contains: z.string().optional(),
  startsWith: z.string().optional(),
  endsWith: z.string().optional(),
  mode: z.lazy(() => QueryModeSchema).optional(),
  not: z.union([ z.string(),z.lazy(() => NestedStringWithAggregatesFilterSchema) ]).optional(),
  _count: z.lazy(() => NestedIntFilterSchema).optional(),
  _min: z.lazy(() => NestedStringFilterSchema).optional(),
  _max: z.lazy(() => NestedStringFilterSchema).optional()
}).strict();

export const UsersCreateclaimsInputSchema: z.ZodType<Prisma.UsersCreateclaimsInput> = z.object({
  set: z.string().array()
}).strict();

export const UsersUpdateclaimsInputSchema: z.ZodType<Prisma.UsersUpdateclaimsInput> = z.object({
  set: z.string().array().optional(),
  push: z.union([ z.string(),z.string().array() ]).optional(),
}).strict();

export const StringFieldUpdateOperationsInputSchema: z.ZodType<Prisma.StringFieldUpdateOperationsInput> = z.object({
  set: z.string().optional()
}).strict();

export const NestedStringFilterSchema: z.ZodType<Prisma.NestedStringFilter> = z.object({
  equals: z.string().optional(),
  in: z.string().array().optional(),
  notIn: z.string().array().optional(),
  lt: z.string().optional(),
  lte: z.string().optional(),
  gt: z.string().optional(),
  gte: z.string().optional(),
  contains: z.string().optional(),
  startsWith: z.string().optional(),
  endsWith: z.string().optional(),
  not: z.union([ z.string(),z.lazy(() => NestedStringFilterSchema) ]).optional(),
}).strict();

export const NestedStringWithAggregatesFilterSchema: z.ZodType<Prisma.NestedStringWithAggregatesFilter> = z.object({
  equals: z.string().optional(),
  in: z.string().array().optional(),
  notIn: z.string().array().optional(),
  lt: z.string().optional(),
  lte: z.string().optional(),
  gt: z.string().optional(),
  gte: z.string().optional(),
  contains: z.string().optional(),
  startsWith: z.string().optional(),
  endsWith: z.string().optional(),
  not: z.union([ z.string(),z.lazy(() => NestedStringWithAggregatesFilterSchema) ]).optional(),
  _count: z.lazy(() => NestedIntFilterSchema).optional(),
  _min: z.lazy(() => NestedStringFilterSchema).optional(),
  _max: z.lazy(() => NestedStringFilterSchema).optional()
}).strict();

export const NestedIntFilterSchema: z.ZodType<Prisma.NestedIntFilter> = z.object({
  equals: z.number().optional(),
  in: z.number().array().optional(),
  notIn: z.number().array().optional(),
  lt: z.number().optional(),
  lte: z.number().optional(),
  gt: z.number().optional(),
  gte: z.number().optional(),
  not: z.union([ z.number(),z.lazy(() => NestedIntFilterSchema) ]).optional(),
}).strict();

/////////////////////////////////////////
// ARGS
/////////////////////////////////////////

export const UsersFindFirstArgsSchema: z.ZodType<Prisma.UsersFindFirstArgs> = z.object({
  select: UsersSelectSchema.optional(),
  where: UsersWhereInputSchema.optional(),
  orderBy: z.union([ UsersOrderByWithRelationInputSchema.array(),UsersOrderByWithRelationInputSchema ]).optional(),
  cursor: UsersWhereUniqueInputSchema.optional(),
  take: z.number().optional(),
  skip: z.number().optional(),
  distinct: z.union([ UsersScalarFieldEnumSchema,UsersScalarFieldEnumSchema.array() ]).optional(),
}).strict()

export const UsersFindFirstOrThrowArgsSchema: z.ZodType<Prisma.UsersFindFirstOrThrowArgs> = z.object({
  select: UsersSelectSchema.optional(),
  where: UsersWhereInputSchema.optional(),
  orderBy: z.union([ UsersOrderByWithRelationInputSchema.array(),UsersOrderByWithRelationInputSchema ]).optional(),
  cursor: UsersWhereUniqueInputSchema.optional(),
  take: z.number().optional(),
  skip: z.number().optional(),
  distinct: z.union([ UsersScalarFieldEnumSchema,UsersScalarFieldEnumSchema.array() ]).optional(),
}).strict()

export const UsersFindManyArgsSchema: z.ZodType<Prisma.UsersFindManyArgs> = z.object({
  select: UsersSelectSchema.optional(),
  where: UsersWhereInputSchema.optional(),
  orderBy: z.union([ UsersOrderByWithRelationInputSchema.array(),UsersOrderByWithRelationInputSchema ]).optional(),
  cursor: UsersWhereUniqueInputSchema.optional(),
  take: z.number().optional(),
  skip: z.number().optional(),
  distinct: z.union([ UsersScalarFieldEnumSchema,UsersScalarFieldEnumSchema.array() ]).optional(),
}).strict()

export const UsersAggregateArgsSchema: z.ZodType<Prisma.UsersAggregateArgs> = z.object({
  where: UsersWhereInputSchema.optional(),
  orderBy: z.union([ UsersOrderByWithRelationInputSchema.array(),UsersOrderByWithRelationInputSchema ]).optional(),
  cursor: UsersWhereUniqueInputSchema.optional(),
  take: z.number().optional(),
  skip: z.number().optional(),
}).strict()

export const UsersGroupByArgsSchema: z.ZodType<Prisma.UsersGroupByArgs> = z.object({
  where: UsersWhereInputSchema.optional(),
  orderBy: z.union([ UsersOrderByWithAggregationInputSchema.array(),UsersOrderByWithAggregationInputSchema ]).optional(),
  by: UsersScalarFieldEnumSchema.array(),
  having: UsersScalarWhereWithAggregatesInputSchema.optional(),
  take: z.number().optional(),
  skip: z.number().optional(),
}).strict()

export const UsersFindUniqueArgsSchema: z.ZodType<Prisma.UsersFindUniqueArgs> = z.object({
  select: UsersSelectSchema.optional(),
  where: UsersWhereUniqueInputSchema,
}).strict()

export const UsersFindUniqueOrThrowArgsSchema: z.ZodType<Prisma.UsersFindUniqueOrThrowArgs> = z.object({
  select: UsersSelectSchema.optional(),
  where: UsersWhereUniqueInputSchema,
}).strict()

export const UsersCreateArgsSchema: z.ZodType<Prisma.UsersCreateArgs> = z.object({
  select: UsersSelectSchema.optional(),
  data: z.union([ UsersCreateInputSchema,UsersUncheckedCreateInputSchema ]),
}).strict()

export const UsersUpsertArgsSchema: z.ZodType<Prisma.UsersUpsertArgs> = z.object({
  select: UsersSelectSchema.optional(),
  where: UsersWhereUniqueInputSchema,
  create: z.union([ UsersCreateInputSchema,UsersUncheckedCreateInputSchema ]),
  update: z.union([ UsersUpdateInputSchema,UsersUncheckedUpdateInputSchema ]),
}).strict()

export const UsersCreateManyArgsSchema: z.ZodType<Prisma.UsersCreateManyArgs> = z.object({
  data: z.union([ UsersCreateManyInputSchema,UsersCreateManyInputSchema.array() ]),
}).strict()

export const UsersDeleteArgsSchema: z.ZodType<Prisma.UsersDeleteArgs> = z.object({
  select: UsersSelectSchema.optional(),
  where: UsersWhereUniqueInputSchema,
}).strict()

export const UsersUpdateArgsSchema: z.ZodType<Prisma.UsersUpdateArgs> = z.object({
  select: UsersSelectSchema.optional(),
  data: z.union([ UsersUpdateInputSchema,UsersUncheckedUpdateInputSchema ]),
  where: UsersWhereUniqueInputSchema,
}).strict()

export const UsersUpdateManyArgsSchema: z.ZodType<Prisma.UsersUpdateManyArgs> = z.object({
  data: z.union([ UsersUpdateManyMutationInputSchema,UsersUncheckedUpdateManyInputSchema ]),
  where: UsersWhereInputSchema.optional(),
}).strict()

export const UsersDeleteManyArgsSchema: z.ZodType<Prisma.UsersDeleteManyArgs> = z.object({
  where: UsersWhereInputSchema.optional(),
}).strict()