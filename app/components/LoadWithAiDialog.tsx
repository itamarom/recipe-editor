import { AlertDialog, AlertDialogBody, AlertDialogContent, AlertDialogFooter, AlertDialogHeader, AlertDialogOverlay, Box, Button, Textarea } from "@chakra-ui/react"
import React, { useState } from "react"
import { getOpenAiClient, summarizeRecipeInFreetext, summarizeRecipeInObject } from "../ai"
import { ChatCompletionMessageParam } from "openai/resources/index.mjs"
import { QueryOutput } from "../types"

export type LoadWithAiDialogProps = {
    isOpen: boolean
    onClose: () => void
    onRecipeLoaded: (queryOutput: QueryOutput) => void
}

export function LoadWithAiDialog({ isOpen, onClose, onRecipeLoaded }: LoadWithAiDialogProps) {
    const [recipeInput, setRecipeInput] = useState('');
    const [recipeSummarizedMessages, setRecipeSummarizedMessages] = useState<ChatCompletionMessageParam[]>();
    const cancelRef = React.useRef(null)
    const [loading, setLoading] = useState(false);

    const handleProcessClick = async () => {
        const client = getOpenAiClient();
        setLoading(true);
        const messages = await summarizeRecipeInFreetext(client, recipeInput);
        setRecipeSummarizedMessages(messages)
        onRecipeLoaded(await summarizeRecipeInObject(client, [...messages]))
        onClose();
        setLoading(false);
    }

    return (
        <AlertDialog
            isOpen={isOpen}
            leastDestructiveRef={cancelRef}
            onClose={onClose}
        >
            <AlertDialogOverlay>
                <AlertDialogContent>
                    <AlertDialogHeader fontSize='lg' fontWeight='bold'>
                        Load recipe with AI
                    </AlertDialogHeader>

                    <AlertDialogBody>

                        <Box className="flex flex-col gap-2">
                            <Textarea className="w-full" placeholder='Paste your recipe content or URL here...'
                                value={recipeInput}
                                disabled={loading}
                                onChange={(e) => setRecipeInput(e.target.value)} />
                            <Button className="w-full" disabled={(!recipeInput) || loading} onClick={handleProcessClick}>Process</Button>

                            {recipeSummarizedMessages && <><h1>Got summarize ingredients:</h1>
                                <Textarea disabled value={recipeSummarizedMessages[recipeSummarizedMessages.length - 1].content?.toString()} />
                                <h1>Processing to UI format...</h1>
                            </>
                            }
                        </Box>

                    </AlertDialogBody>

                    {/* <AlertDialogFooter>
                        <Button ref={cancelRef} onClick={onClose}>
                            Cancel
                        </Button>
                        <Button colorScheme='red' onClick={onClose} ml={3}>
                            Delete
                        </Button>
                    </AlertDialogFooter> */}
                </AlertDialogContent>
            </AlertDialogOverlay>
        </AlertDialog>

    )
}