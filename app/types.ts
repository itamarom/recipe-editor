import { createTypeAlias, printNode, zodToTs } from 'zod-to-ts'
import { z } from 'zod';

function createTypeReflection(schema: z.ZodType<any, z.ZodTypeDef, any>, name: string) {
  return printNode(createTypeAlias(zodToTs(schema, name).node, name));
}

export enum Units {
  Grams = "Grams",
  Kg = "Kg",
  Tsp = "Tsp",
  Tbsp = "Tbsp",
  Cup = "Cup",
  Unit = "Unit",
}
export const UnitsSchema = z.nativeEnum(Units);
export const UnitsTypeReflection = createTypeReflection(UnitsSchema, 'Units');

export const IngredientMacrosSchema = z.object({
  name: z.string(),
  calories_per_gram: z.number(),
  protein_per_gram: z.number(),
  grams_per_cup: z.number().optional(), 
  grams_per_unit: z.number().optional(),
});
export type IngredientMacros = z.infer<typeof IngredientMacrosSchema>;
export const IngredientMacrosTypeReflection = createTypeReflection(IngredientMacrosSchema, 'IngredientMacros');

export const IngredientSchema = z.object({
  name: z.string(),
  macros: IngredientMacrosSchema,
  amount: z.number(),
  unit: UnitsSchema,
});
export type Ingredient = z.infer<typeof IngredientSchema>;
export const IngredientTypeReflection = createTypeReflection(IngredientSchema, 'Ingredient');

export const SavedRecipeSchema = z.object({
  recipeTitle: z.string(),
  ingredients: z.array(IngredientSchema),
  portions: z.number(),
});
export type SavedRecipe = z.infer<typeof SavedRecipeSchema>;
export const SavedRecipeTypeReflection = createTypeReflection(SavedRecipeSchema, 'SavedRecipe');

export const QueryOutputSchema = z.object({
  recipe: SavedRecipeSchema.required(),
  missingIngredients: z.array(IngredientSchema),
});
export type QueryOutput = z.infer<typeof QueryOutputSchema>;
export const QueryOutputTypeReflection = createTypeReflection(QueryOutputSchema, 'QueryOutput');

export const AllTypesReflection = `${UnitsTypeReflection}
${IngredientMacrosTypeReflection}
${IngredientTypeReflection}
${SavedRecipeTypeReflection}
${QueryOutputTypeReflection}`;
