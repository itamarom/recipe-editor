"use client";
import {
  Box,
  Button,
  Checkbox,
  Heading,
  Input,
  Select,
  Table,
  Tbody,
  Td,
  Th,
  Thead,
  Tr,
  useDisclosure,
  VStack,
} from "@chakra-ui/react";
import Fuse from "fuse.js";
import { useState, useEffect } from "react";
import ingredientsJsonRaw from "./ingredients.json";
import { Ingredient, IngredientMacros, SavedRecipe, SavedRecipeSchema, Units } from "./types";
import { LoadWithAiDialog } from "./components/LoadWithAiDialog";
import { useRouter, usePathname, useSearchParams } from "next/navigation";

const ingredientsJson: IngredientMacros[] = ingredientsJsonRaw;

const TspToCup = 1 / 48;
const TbspToCup = 1 / 16;

interface MacrosSummary {
  calories: number;
  protein: number;
  grams: number;
}

function round(x?: number) {
  if (!x) {
    return x;
  }
  return Math.round(x * 10) / 10;
}

function calculateCalories(ingredient: Ingredient): MacrosSummary | null {
  const macros = ingredient.macros;
  let grams;

  if (ingredient.unit === Units.Unit) {
    if (!macros.grams_per_unit) {
      throw new Error(`Missing grams_per_unit for ${macros.name}`);
    }
    grams = ingredient.amount * macros.grams_per_unit;
  } else if (ingredient.unit === Units.Grams) {
    grams = ingredient.amount;
  } else if (ingredient.unit === Units.Kg) {
    grams = ingredient.amount * 1000;
  } else if (ingredient.unit === Units.Cup) {
    if (!macros.grams_per_cup) {
      throw new Error(`Missing grams_per_cup for ${macros.name}`);
    }
    grams = ingredient.amount * macros.grams_per_cup;
  } else if (ingredient.unit === Units.Tsp) {
    if (!macros.grams_per_cup) {
      throw new Error(`Missing grams_per_cup for ${macros.name}`);
    }
    grams = ingredient.amount * TspToCup * macros.grams_per_cup;
  } else if (ingredient.unit === Units.Tbsp) {
    if (!macros.grams_per_cup) {
      throw new Error(`Missing grams_per_cup for ${macros.name}`);
    }
    grams = ingredient.amount * TbspToCup * macros.grams_per_cup;
  }

  if (grams === undefined) {
    alert("Bad unit:" + ingredient.unit);
    return null;
  }

  return {
    calories: grams * macros.calories_per_gram,
    protein: grams * macros.protein_per_gram,
    grams,
  };
}

function calculateCaloriesForAll(ingredients: Ingredient[]): MacrosSummary {
  const perIngredient = ingredients.map(calculateCalories).filter((v) => v);

  return {
    calories: perIngredient.map((i) => i?.calories!).reduce((a, b) => a + b, 0),
    protein: perIngredient.map((i) => i?.protein!).reduce((a, b) => a + b, 0),
    grams: perIngredient.map((i) => i?.grams!).reduce((a, b) => a + b, 0),
  };
}

const EmptyIngredient: Partial<Ingredient> = {
  amount: 0,
  unit: Units.Grams,
};

const MainPage = () => {
  const aiDialogDisclosur = useDisclosure()
  const [dialogId, setDialogId] = useState("");

  const [recipeTitle, setRecipeTitle] = useState("");
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [newIngredient, setNewIngredient] = useState<Partial<Ingredient>>({
    ...EmptyIngredient,
  });

  const [newIngredientName, setNewIngredientName] = useState("");
  const [portions, setPortions] = useState(1);
  const [suggestions, setSuggestions] = useState<IngredientMacros[]>([]);

  const [sortedByCals, setSortedByCals] = useState(false);

  const router = useRouter();
  const params = useSearchParams();
  const pathname = usePathname();

  useEffect(() => {
    if (!params) {
      return;
    }

    const saved_query = params.get('saved_query');
    if (!saved_query) {
      return
    }

    const recipe = SavedRecipeSchema.parse(JSON.parse(saved_query as string));
    setFromSavedRecipe(recipe);
    router.replace(pathname);

  }, [params]);

  // Setup Fuse.js options
  const fuseOptions = {
    keys: ["name"],
    threshold: 0.3, // Adjust this value to make the search more or less strict
  };
  const fuse = new Fuse(ingredientsJson, fuseOptions);

  const handleRecipeTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setRecipeTitle(e.target.value);
  };

  const handleIngredientNameChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const value = e.target.value;
    // Perform search directly here
    setNewIngredientName(value);
    setNewIngredient((newIngredient) => ({
      ...newIngredient,
      macros: undefined,
    }));

    if (value.length > 0) {
      const result = fuse.search(value);
      setSuggestions(result.map((r) => r.item));
    } else {
      setSuggestions([]);
    }
  };
  const selectSuggestion = (macros: IngredientMacros) => {
    setNewIngredient((prevState) => ({ ...prevState, macros }));
    setNewIngredientName(macros.name);
    setSuggestions([]);
  };

  const exportRecipe = () => {
    // Create a JSON string from the recipe title and ingredients
    const recipeData: SavedRecipe = {
      recipeTitle,
      ingredients,
      portions,
    };
    const recipeDataJson = JSON.stringify(recipeData, null, 2); // The `null` and `2` arguments format the JSON for readability

    // Create a blob with the JSON data
    const blob = new Blob([recipeDataJson], { type: "application/json" });

    // Create a URL for the blob
    const url = URL.createObjectURL(blob);

    // Create a temporary anchor element and trigger the download
    const a = document.createElement("a");
    a.href = url;
    a.download = `${recipeTitle.replace(/\s+/g, "_") || "recipe"}.json`; // Use the recipe title as the filename, replacing spaces with underscores
    document.body.appendChild(a); // Append the anchor to the body
    a.click(); // Trigger the download
    document.body.removeChild(a); // Remove the anchor from the body

    // Revoke the blob URL to free up resources
    URL.revokeObjectURL(url);
  };

  const setFromSavedRecipe = (recipe: SavedRecipe) => {
    setRecipeTitle(recipe.recipeTitle)
    setPortions(recipe.portions);
    setIngredients(recipe.ingredients);
  }

  const handleFileImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files ? event.target.files[0] : null;
    if (!file) {
      alert("No file selected.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e: ProgressEvent<FileReader>) => {
      const content = e.target?.result;
      try {
        if (typeof content === "string") {
          setFromSavedRecipe(SavedRecipeSchema.parse(JSON.parse(content)))
        }
      } catch (error) {
        console.error("Error reading file:", error);
        alert("Failed to load recipe.");
      }
    };

    reader.readAsText(file);
  };

  const openImportDialog = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.addEventListener('change', (e) => {
      const event = e as unknown as React.ChangeEvent<HTMLInputElement>;
      handleFileImport(event);
    });
    input.click();
  };

  const addIngredient = () => {
    if (newIngredient.macros && newIngredient.amount && newIngredient.unit) {
      setIngredients([
        ...ingredients,
        {
          name: newIngredient.macros.name,
          macros: newIngredient.macros,
          amount: newIngredient.amount,
          unit: newIngredient.unit,
        },
      ]);
      setNewIngredient({ ...EmptyIngredient });
      setNewIngredientName("");
    } else {
      alert("Please fill in all fields for the ingredient.");
    }
  };

  const deleteIngredient = (index: number) => {
    const updatedIngredients = [...ingredients];
    updatedIngredients.splice(index, 1);
    setIngredients(updatedIngredients);
  };
  const total = calculateCaloriesForAll(ingredients);

  const sortedIngredients = Object.entries(ingredients);
  if (sortedByCals) {
    sortedIngredients.sort(([originalKeyA, ingredientA], [originalKeyB, ingredientB]) => (calculateCalories(ingredientB)?.calories || 0) - (calculateCalories(ingredientA)?.calories || 0));
  }
  const sortedIngredientsIntKeys: [number, Ingredient][] = sortedIngredients.map(([key, ing]) => [parseInt(key), ing])

  return (
    <Box
      p={5}
      shadow="md"
      borderWidth="1px"
      borderRadius="lg"
      overflow="hidden"
    >
      <Heading mb={6} textAlign="center" size="lg" color="teal.400">
        Macro Calculator
      </Heading>
      <Input
        placeholder="Recipe Title"
        value={recipeTitle}
        onChange={handleRecipeTitleChange}
        mb={4}
        size="lg"
        variant="flushed"
        focusBorderColor="teal.300"
      />
      <Checkbox
        isChecked={sortedByCals}
        onChange={(e) => setSortedByCals(e.target.checked)}
      >
        Sort by Calories
      </Checkbox>
      <Box overflow={"scroll"}>
        <Table variant="striped" colorScheme="teal">
          <Thead>
            <Tr>
              <Th></Th>
              <Th>Ingredient</Th>
              <Th>Amount</Th>
              <Th>Amount per portion</Th>
              <Th>Calories</Th>
              <Th>Protein</Th>
            </Tr>
          </Thead>
          <Tbody>
            {sortedIngredientsIntKeys.map(([index, ingredient]) => (
              <Tr key={index}>
                <Td width={50}>
                  <Button
                    colorScheme="red"
                    size="sm"
                    onClick={() => deleteIngredient(index)}
                  >
                    X
                  </Button>
                </Td>
                <Td>{ingredient.macros?.name || "Unnamed Ingredient"}</Td>
                <Td>
                  {ingredient.amount} {ingredient.unit}
                  {ingredient.unit !== Units.Grams && (
                    <>
                      &nbsp; ({round(calculateCalories(ingredient)?.grams)}{" "}
                      grams)
                    </>
                  )}
                </Td>
                <Td>
                  {round(
                    (calculateCalories(ingredient)?.grams || 0) / portions
                  )}
                  &nbsp;grams
                </Td>
                <Td>{round(calculateCalories(ingredient)?.calories)}</Td>
                <Td>{round(calculateCalories(ingredient)?.protein)}</Td>
              </Tr>
            ))}

            <Tr>
              <Td></Td>
              <Td>Total</Td>
              <Td>{round(total.grams)} grams</Td>
              <Td></Td>
              <Td>{round(total.calories)}</Td>
              <Td>{round(total.protein)}</Td>
            </Tr>

            <Tr>
              <Td></Td>
              <Td>Total (per portion)</Td>
              <Td>{round(total.grams / (portions || 1))} grams</Td>
              <Td></Td>
              <Td>{round(total.calories / (portions || 1))}</Td>
              <Td>{round(total.protein / (portions || 1))}</Td>
            </Tr>
          </Tbody>
        </Table>
      </Box>
      <Box className="flex items-center justify-center">
        Portions:
        <Input
          type="number"
          name="portions"
          value={portions}
          onChange={(e) => setPortions(parseFloat(e.target.value))}
          placeholder="Portions"
          mr={2}
          variant="flushed"
          focusBorderColor="teal.300"
          mb={2}
        />
      </Box>
      <Box width="100%" className="flex flex-row justify-center items-center">
        <Box className="flex" width={"600px"} mt={6} gap={1} justifyItems={"center"} alignItems={"center"} flexDir={"column"}>
          <Box className="w-full border-solid border-2 rounded-md p-2" >
            <Input
              type="text"
              name="name"
              value={newIngredientName}
              onChange={handleIngredientNameChange}
              placeholder="New Ingredient Name"
              autoComplete="off"
              variant="flushed"
              focusBorderColor="teal.300"
              mb={2}
            />
            {suggestions.length > 0 && (
              <VStack align="start" mt={2}>
                {suggestions.map((suggestion) => (
                  <Button
                    key={suggestion.name}
                    variant="ghost"
                    justifyContent="start"
                    onClick={() => selectSuggestion(suggestion)}
                    _hover={{ bg: "teal.100" }}
                  >
                    {suggestion.name}
                  </Button>
                ))}
              </VStack>
            )}
            <Input
              type="number"
              name="amount"
              value={newIngredient.amount || ""}
              onChange={(e) =>
                setNewIngredient({
                  ...newIngredient,
                  [e.target.name]: parseFloat(e.target.value),
                })
              }
              placeholder="Amount"
              mr={2}
              variant="flushed"
              focusBorderColor="teal.300"
              mb={2}
            />
            <Select
              name="unit"
              value={newIngredient.unit || Units.Grams}
              onChange={(e) =>
                setNewIngredient({
                  ...newIngredient,
                  [e.target.name]: e.target.value,
                })
              }
              placeholder="Select unit"
              mr={2}
              variant="flushed"
              focusBorderColor="teal.300"
              mb={4}
            >
              {Object.values(Units).map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </Select>
            <Button
              disabled={!newIngredient.macros}
              colorScheme="blue"
              onClick={addIngredient}
              w="full"
            >
              Add Ingredient
            </Button>
          </Box>
          <Box width={"250px"} mt={6} gap={1} display="flex" flexDir={"column"}>
            <Button colorScheme="blue" onClick={() => { setDialogId(Math.random().toString()); aiDialogDisclosur.onOpen(); }} w="full">Load recipe with AI</Button>
            <Button colorScheme="blue" onClick={openImportDialog} w="full">
              Import recipe
            </Button>
            <Button colorScheme="blue" onClick={exportRecipe} w="full">
              Export recipe
            </Button>
            <Button colorScheme="blue" onClick={() => {
              const recipeData: SavedRecipe = {
                recipeTitle,
                ingredients,
                portions,
              };
              const recipeDataJson = JSON.stringify(recipeData, null, 2);
              const url = `${window.location.origin}${window.location.pathname}?saved_query=${encodeURIComponent(recipeDataJson)}`;
              navigator.clipboard.writeText(url);
              alert("Recipe URL copied to clipboard!");
            }} w="full">
              Share this recipe
            </Button>
            <LoadWithAiDialog key={dialogId} onClose={aiDialogDisclosur.onClose} isOpen={aiDialogDisclosur.isOpen} onRecipeLoaded={(recipe) => setFromSavedRecipe(recipe.recipe)} />
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

export default MainPage;
