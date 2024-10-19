import ingredientsJsonRaw from "./ingredients.json";
import OpenAI from 'openai';
import { zodResponseFormat } from "openai/helpers/zod";
import { AllTypesReflection, IngredientMacrosSchema, QueryOutputSchema } from "./types";
import { ChatCompletionMessageParam } from "openai/resources/index.mjs";

const openAiKey = 'KEY_HERE'

const client = new OpenAI({
  apiKey: openAiKey,
  dangerouslyAllowBrowser: true
});

const queryStructured = `
Here is a TS structure: ${AllTypesReflection}

Here is an existing ingredient list: ${JSON.stringify(ingredientsJsonRaw)}

Convert this recipe to the TS structure and ingredient list.

The name of the ingredient should be the name of the ingredient in the ingredients list.
If you find an ingredient in the ingredients list, use that. If an ingredient is missing, include it in the recipe and add it to the missingIngredients array.
Make sure to include all ingredients.
It is *IMPERATIVE* that you include grams_per_cup and grams_per_unit for all ingredients.

Output the recipe as valid QueryOutput object in JSON format.
I will tip you 1000$ if you do this correctly.
`

export async function summarizeRecipe(urlOrText: string) {
  const urlToRecipePrompt = `Here is a recipe: ${urlOrText}
  Please give me only the ingredients list`
  console.log(query)
  console.log('kek 1')
  const messages: any[] = []
  messages.push({ "role": "user", "content": urlToRecipePrompt })
  const completion = await client.chat.completions.create({
    model: "gpt-4",
    messages: messages,
  });
  console.log('kek 2 completion=', completion.choices[0].message.content)

  messages.push({ "role": "assistant", "content": completion.choices[0].message.content })
  messages.push({ "role": "user", "content": queryStructured })

  //   const messages: ChatCompletionMessageParam[] = [...]
  console.log('kek 3 messages=', messages)

  const format = zodResponseFormat(QueryOutputSchema, 'query_output');
  // Unfortunatley, the OpenAI API does not support optional fields in the response format yet.
  (format as any).json_schema.schema.definitions.query_output_properties_recipe_properties_ingredients_items_properties_macros_properties_grams_per_cup = {
    "type": "number"
  };
  (format as any).json_schema.schema.definitions.query_output_properties_recipe_properties_ingredients_items_properties_macros_properties_grams_per_unit = {
    "type": "number"
  };

  console.log('kek 4 format=', format)

  const completion2 = await client.beta.chat.completions.parse({
    model: "gpt-4o-2024-08-06",
    messages: messages,
    response_format: format,
    stream: false
  })

  const resultJson = completion2.choices[0].message.content
  if (!resultJson) {
    throw new Error('No result from AI')
  }
  const result = JSON.parse(resultJson);

  // const result =JSON.parse(`{"recipe":{"recipeTitle":"Dan Dan Inspired Peanut Noodles","ingredients":[{"name":"Peanut butter","macros":{"name":"Peanut butter","calories_per_gram":5.9,"protein_per_gram":0.25,"grams_per_cup":250,"grams_per_unit":0},"amount":250,"unit":"Grams"},{"name":"Chilli oil","macros":{"name":"Chilli oil","calories_per_gram":6.74,"protein_per_gram":0,"grams_per_cup":216,"grams_per_unit":0},"amount":32,"unit":"Grams"},{"name":"Soy sauce","macros":{"name":"Soy sauce","calories_per_gram":0.53,"protein_per_gram":0.08,"grams_per_cup":240,"grams_per_unit":0},"amount":29,"unit":"Grams"},{"name":"Rice vinegar","macros":{"name":"Rice vinegar","calories_per_gram":0,"protein_per_gram":0,"grams_per_cup":240,"grams_per_unit":0},"amount":29,"unit":"Grams"},{"name":"Sugar","macros":{"name":"Sugar","calories_per_gram":3.87,"protein_per_gram":0,"grams_per_cup":200,"grams_per_unit":0},"amount":8,"unit":"Grams"},{"name":"Vegetable oil","macros":{"name":"Vegetable oil","calories_per_gram":8.84,"protein_per_gram":0,"grams_per_cup":192,"grams_per_unit":0},"amount":60,"unit":"Grams"},{"name":"Pork mince","macros":{"name":"Pork mince","calories_per_gram":2.93,"protein_per_gram":0.25,"grams_per_cup":0,"grams_per_unit":0},"amount":113,"unit":"Grams"},{"name":"Sichuan peppercorns","macros":{"name":"Sichuan peppercorns","calories_per_gram":3,"protein_per_gram":0.11,"grams_per_cup":108,"grams_per_unit":0},"amount":5,"unit":"Grams"},{"name":"Ginger","macros":{"name":"Ginger","calories_per_gram":0.8,"protein_per_gram":0.018,"grams_per_cup":240,"grams_per_unit":0},"amount":6,"unit":"Grams"},{"name":"Garlic cloves","macros":{"name":"Garlic cloves","calories_per_gram":1.49,"protein_per_gram":0.06,"grams_per_cup":150,"grams_per_unit":6},"amount":3,"unit":"Unit"},{"name":"Peanuts","macros":{"name":"Peanuts","calories_per_gram":5.9,"protein_per_gram":0.26,"grams_per_cup":146,"grams_per_unit":0},"amount":30,"unit":"Grams"},{"name":"Green onions","macros":{"name":"Green onions","calories_per_gram":0.32,"protein_per_gram":0.019,"grams_per_cup":100,"grams_per_unit":0},"amount":3,"unit":"Unit"}],"portions":4},"missingIngredients":[{"name":"Rice vinegar","macros":{"name":"Rice vinegar","calories_per_gram":0,"protein_per_gram":0,"grams_per_cup":240,"grams_per_unit":0},"amount":29,"unit":"Grams"},{"name":"Fresh chow mein noodles","macros":{"name":"Fresh chow mein noodles","calories_per_gram":1.4,"protein_per_gram":0.05,"grams_per_cup":0,"grams_per_unit":0},"amount":170,"unit":"Grams"}]}`)
  console.log(result)

  return QueryOutputSchema.parse(result);
}
