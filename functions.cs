static async Task<string> GetPageTypeFromAds(AdDataResponse ads)
        {
            List<string> bodies = new List<string>();

            for(int i = 0; i < ads.Data.Count; i++)
            {
                if (ads.Data[i].ad_creative_bodies != null)
                {
                    for (int j = 0; j < ads.Data[i].ad_creative_bodies.Count; j++)
                    {
                        if (!bodies.Contains(ads.Data[i].ad_creative_bodies[j]))
                        {
                            if(bodies.Count < 30)
                            {
                                bodies.Add(ads.Data[i].ad_creative_bodies[j]);
                            }
                        }
                    }
                }
            }

            if (bodies.Count != 0)
            {
                Services.ChatCompletionCreateResponse responses = await ChatGPTService.OpenAI_PageType(ads.Data[0].page_name, bodies);

                if (responses != null)
                {
                    return responses.Choices[0];
                }
            }

            return null;
        }

public static async Task<ChatCompletionCreateResponse> OpenAI_PageType(string pageName, List<string> bodies)
        {
            // Hardcoded valid categories - single source of truth
            var validCategories = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
    {
        "Print on demand",
        "Personalized products",
        "Mix of everything",
        "Clothes",
        "Car accessories",
        "Pets",
        "Kids",
        "Jewelry",
        "Outdoors/Survival",
        "Home decor",
        "Electronics",
        "Phone cases",
        "Make up",
        "Fitness",
        "Health",
        "Tools",
        "Videos",
        "Health care",
        "Others",
        "Phone program",
        "Computer program",
        "Books",
        "Food",
        "Travel",
        "Real estate",
        "Furniture"
    };

            string request = $"Page name: {pageName}\r\n";

            if (bodies != null)
            {
                for (int i = 0; i < bodies.Count; i++)
                {
                    request += $"Ad {i + 1}: {bodies[i]}\r\n";
                }

                // Improved prompt with explicit instructions and examples
                request += "\r\nYour task: Classify this Facebook page into EXACTLY ONE category from the list below.\r\n\r\n";
                request += "CRITICAL RULES:\r\n";
                request += "1. Output ONLY the category name, nothing else\r\n";
                request += "2. Do NOT add punctuation, explanations, or extra text\r\n";
                request += "3. Copy the category name EXACTLY as written\r\n";
                request += "4. If unsure or doesn't fit clearly, output: Others\r\n\r\n";
                request += "VALID CATEGORIES:\r\n";
                request += "Print on demand, Personalized products, Mix of everything, Clothes, Car accessories, Pets, Kids, Jewelry, Outdoors/Survival, Home decor, Electronics, Phone cases, Make up, Fitness, Health, Tools, Videos, Health care, Others, Phone program, Computer program, Books, Food, Travel, Real estate, Furniture\r\n\r\n";
                request += "Examples:\r\n";
                request += "Input: Custom t-shirt designs → Output: Print on demand\r\n";
                request += "Input: Dog toys and treats → Output: Pets\r\n";
                request += "Input: Kitchen utensils → Output: Home decor\r\n\r\n";
                request += "Now classify the page above:";

                try
                {
                    // Key should ideally be in env vars, replacing hardcoded key with placeholder for git push.
                    var apiClient = new OpenAI_API.OpenAIAPI(Environment.GetEnvironmentVariable("OPENAI_API_KEY") ?? "YOUR_API_KEY");

                    var chatRequest = new ChatRequest
                    {
                        Model = "gpt-4o-mini",
                        Temperature = 0.2F,
                        MaxTokens = 4096,
                        Messages = new OpenAI_API.Chat.ChatMessage[]
                        {
                    new OpenAI_API.Chat.ChatMessage(ChatMessageRole.System, "You are a precise classification system. You output ONLY the exact category name from the provided list, with no additional text, punctuation, or explanation."),
                    new OpenAI_API.Chat.ChatMessage(ChatMessageRole.User, request)
                        }
                    };

                    var results = await apiClient.Chat.CreateChatCompletionAsync(chatRequest);

                    if (results != null && results.Choices != null && results.Choices.Count > 0)
                    {
                        // Extract and clean the response
                        var resultText = results.Choices[0].Message.Content?.Trim();

                        // Remove common punctuation that might be added
                        resultText = resultText?.TrimEnd('.', '!', '?', ',', ';', ':');

                        Console.WriteLine($"Raw API Response: {resultText}");

                        // Validation: Check if response matches a valid category
                        string validatedCategory = "Others"; // Default fallback

                        if (!string.IsNullOrWhiteSpace(resultText))
                        {
                            // Try exact match first
                            if (validCategories.Contains(resultText))
                            {
                                validatedCategory = validCategories.First(c => c.Equals(resultText, StringComparison.OrdinalIgnoreCase));
                            }
                            else
                            {
                                // Try finding a category that contains the response or vice versa
                                var partialMatch = validCategories.FirstOrDefault(c =>
                                    resultText.IndexOf(c, StringComparison.OrdinalIgnoreCase) >= 0 ||
                                    c.IndexOf(resultText, StringComparison.OrdinalIgnoreCase) >= 0);

                                if (partialMatch != null)
                                {
                                    validatedCategory = partialMatch;
                                    Console.WriteLine($"Partial match found: {partialMatch}");
                                }
                                else
                                {
                                    Console.WriteLine($"Invalid category returned: '{resultText}'. Defaulting to 'Others'");
                                }
                            }
                        }

                        Console.WriteLine($"Completed ChatGPT call. Bodies count: {bodies.Count} Final Category: {validatedCategory}");

                        // Send webhook notification with the category result
                        await SendCategoryWebhook(pageName, validatedCategory, resultText);

                        return new ChatCompletionCreateResponse
                        {
                            Choices = new List<string> { validatedCategory }
                        };
                    }
                    else
                    {
                        Console.WriteLine("No valid response received from the OpenAI API.");
                    }
                }
                catch (TaskCanceledException ex)
                {
                    Console.WriteLine("Request timed out. " + ex.Message);
                }
                catch (Exception ex)
                {
                    Console.WriteLine("An error occurred: " + ex.Message);
                }
            }

            return null;
        }