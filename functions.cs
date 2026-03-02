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


public static async Task GetAvailableAccessToken(string message = null)
{

    accessTokens = await backendDatabaseService.GetAccessTokens();

    var lithuanianTimeZone = TimeZoneInfo.FindSystemTimeZoneById("FLE Standard Time");
    var currentTimeInLithuania = TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, lithuanianTimeZone);

    int tokensCheckedCount = 0;
    bool tokenChanged = false;

    for (int i = 0; i < accessTokens.Count; i++)
    {
        tokensCheckedCount++;
        var token = accessTokens[i];

        if (token.status == "LIMIT" && token.AvailableTime <= currentTimeInLithuania)
        {
            token.status = "READY";
            await backendDatabaseService.UpdateAccessToken(token);
        }
    }

    var groupedTokens = accessTokens
        .Where(token => token.status == "READY" && token.AvailableTime <= currentTimeInLithuania)
        .OrderBy(token => token.AvailableTime)
        .ToList();


    // Determine if we're in initialization mode
    bool isInitialization = recentTokenChangeTimes.Count == 0;

    // Only randomize tokens if NOT in initialization mode AND we have previous token changes
    /*if (!isInitialization && recentTokenChangeTimes.Count > 0)
    {
        var random = new Random();
        groupedTokens = groupedTokens.OrderBy(x => random.Next()).ToList();
    }*/

    TimeSpan tenMinutes = TimeSpan.FromMinutes(10);

    foreach (var token in groupedTokens)
    {
        TimeSpan timeSinceLastHeartBeat = TimeSpan.MaxValue;
        if (token.HeartBeat != null)
        {
            timeSinceLastHeartBeat = (TimeSpan)(currentTimeInLithuania - token.HeartBeat);
        }

        if (timeSinceLastHeartBeat >= tenMinutes)
        {
            currentAccessToken = token;


            // Prepare token summary (first 4 and last 4 chars)
            string tokenStr = token.accessToken ?? "";
            string tokenSummary = tokenStr.Length > 8 ? tokenStr.Substring(0, 4) + "..." + tokenStr.Substring(tokenStr.Length - 4) : tokenStr;

            Console.WriteLine($"Changing access token to {accessTokens.IndexOf(currentAccessToken)}/{accessTokens.Count} limit: {limit}");

            // Track the token change
            recentTokenChangeTimes.Add(currentTimeInLithuania);
            recentTokenChangeTokens.Add(tokenSummary);

            // Remove entries older than 30 minutes
            recentTokenChangeTimes.RemoveAll(time => (currentTimeInLithuania - time) > TimeSpan.FromMinutes(10));
            recentTokenChangeTokens = recentTokenChangeTokens.Take(recentTokenChangeTimes.Count).ToList();

            int recentChangeCount = recentTokenChangeTimes.Count;

            // Determine event type and send appropriate webhook
            if (recentChangeCount == 1)
            {
                // First token assignment - initialization
                await SendTokenChangeLog("Initializing Tokens for computer", tokensCheckedCount, tokenSummary, recentChangeCount, currentAccessToken.AvailableTime);
            }
            else if (recentChangeCount >= 5)
            {
                // Token limit reached - send LimitReached event only
                Console.WriteLine("⚠️ Token has been changed 5 or more times in the last 10 minutes.");
                await SendTokenChangeLog("LimitReached", tokensCheckedCount, tokenSummary, recentChangeCount, currentAccessToken.AvailableTime) ;
                await Program.TerminateThisInstance("⚠️ Token has been changed 5 or more times in the last 10 minutes.");
            }
            else
            {
                // Regular token change (2 or more but less than 3)
                if (message != null)
                {
                    await SendTokenChangeLog(message, tokensCheckedCount, tokenSummary, recentChangeCount, currentAccessToken.AvailableTime);

                }
                else
                {
                    await SendTokenChangeLog("TokenChanged", tokensCheckedCount, tokenSummary, recentChangeCount, currentAccessToken.AvailableTime);

                }
            }

            await SendHeartBeatAccessToken();
            tokenChanged = true;
            limit = 500;
            break;
        }
        // If token doesn't meet heartbeat requirement, continue to next token in order
    }

    if (!tokenChanged)
    {
        Console.WriteLine("No suitable token found. Waiting...");
        await WaitAndRetry();
    }
}




public static async Task CheckIfAccessTokenExhausted(HttpResponseMessage response)
{
    bool rateLimit = false;
    if (response.Headers.Contains("x-business-use-case-usage"))
    {
        // Get the header value
        var headerValue = response.Headers.GetValues("x-business-use-case-usage").FirstOrDefault();

        if (!string.IsNullOrEmpty(headerValue))
        {
            try
            {
                // Parse the JSON in the header
                var jsonHeader = JObject.Parse(headerValue);

                // Assuming the structure in your example, get the first key and extract the estimated_time_to_regain_access
                var firstKey = jsonHeader.Properties().First().Name;
                var estimatedTime = jsonHeader[firstKey]?.FirstOrDefault()?["estimated_time_to_regain_access"]?.Value<int>();
                var total_time = jsonHeader[firstKey]?.FirstOrDefault()?["total_time"]?.Value<int>();
                var total_cputime = jsonHeader[firstKey]?.FirstOrDefault()?["total_cputime"]?.Value<int>();

                int maxTime;
                if (total_time > total_cputime)
                    maxTime = (int)total_time;
                else
                    maxTime = (int)total_cputime;

                Console.WriteLine($"time remaining: {estimatedTime}; maxTime: {maxTime};");

                if (maxTime >= 90)
                {
                    int maxDelay = (maxTime - 88) * 30;


                    var lithuanianTimeZone = TimeZoneInfo.FindSystemTimeZoneById("FLE Standard Time");
                    var currentTimeInLithuania = TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, lithuanianTimeZone);

                    // Calculate the time when the access token will be available again
                    DateTime availableTime = currentTimeInLithuania.AddMinutes(maxDelay);

                    currentAccessToken.status = "LIMIT";
                    currentAccessToken.AvailableTime = availableTime;

                    rateLimitCount++;
                    rateLimit = true;

                    await backendDatabaseService.UpdateAccessToken(currentAccessToken);



                    await GetAvailableAccessToken("Changing token because max time is higher or equal to 90");
                }

            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error processing rate limit: {ex}");
            }
        }
    }

    if (!rateLimit)
    {
        rateLimitCount = 0;
    }

    if (rateLimitCount >= 3)
    {
        await Program.TerminateThisInstance("rate limit count caught");
        //Program.StopSlaveAndMarkError();
    }
}

if(!errorContent.IsNullOrEmpty())
                                    {
                                        var errorObject = JObject.Parse(errorContent);
                                        var error = errorObject["error"];
                                        var errorCode = errorObject["error"]?["code"]?.Value<int>();
                                        var errorSubcode = errorObject["error"]?["error_subcode"]?.Value<int>();
                                        var isTransient = error?["is_transient"]?.Value<bool>() ?? false;

                                        if (errorCode == 33 && errorSubcode == 2334021)
                                        {
                                            Console.WriteLine($"Error: Invalid Page ID detected for pageId {pageId}. Skipping.");
                                            break;
                                        }
                                        else if (isTransient || errorCode == 2)
                                        {
                                            Console.WriteLine($"Transient error detected for pageId {pageId}. Skipping...");
                                            return null; // retry the current iteration
                                        }
                                        else
                                        {
                                            await ProcessError(response);
                                            continue;
                                        }
                                    }
                                    else
                                    {
                                        // NEW HANDLING: Retry once with lower limit (200) if we got a 500 error
                                        if (response.StatusCode == HttpStatusCode.InternalServerError && limit != 200)
                                        {
                                            Console.WriteLine($"Got 500 Internal Server Error for limit={limit}. Retrying once with limit=200...");

                                            functionAPILimit = 200; // reduce limit
                                            await Task.Delay(2000); // small backoff before retry

                                            // Restart the same iteration with new limit
                                            continue;
                                        }

                                        // Otherwise, normal error handling
                                        await ProcessError(response);
                                        continue;
                                    }



public static async Task ProcessError(HttpResponseMessage response)
        {
            bool rateLimit = false;
            // Read the response content as a string
            string jsonResponse = await response.Content.ReadAsStringAsync();

            // Validate response is not empty or whitespace
            if (string.IsNullOrWhiteSpace(jsonResponse))
            {
                Console.WriteLine("Error: Response body is empty or whitespace.");
                await Program.TerminateThisInstance("Empty response body received");
                return;
            }

            try
            {
                // Parse the JSON response
                var jsonObject = JObject.Parse(jsonResponse);

                // Extract the error code, message, and subcode
                var errorCode = jsonObject["error"]?["code"]?.Value<int>();
                var errorMessage = jsonObject["error"]?["message"]?.ToString();
                var errorSubcode = jsonObject["error"]?["error_subcode"]?.Value<int>();


                if (errorCode == 1)
                {
                    if (errorSubcode == 99)
                    {
                        // Handle the specific case of error code 1 with subcode 99
                        Console.WriteLine("Error: An unknown error occurred (subcode 99).");

                        await Task.Delay(1000 * 60);

                        return;
                    }
                    else
                    {

                        if (limit == 500)
                        {
                            limit = 200;
                        }
                        else if (limit == 200)
                        {
                            limit = 100;
                        }
                        else if (limit == 100)
                        {
                            limit = 50;
                        }
                        else if (limit == 50)
                        {
                            var lithuanianTimeZone = TimeZoneInfo.FindSystemTimeZoneById("FLE Standard Time");
                            var currentTimeInLithuania = TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, lithuanianTimeZone);

                            // Calculate the time when the access token will be available again
                            DateTime availableTime = currentTimeInLithuania.AddMinutes(60);
                            currentAccessToken.status = "LIMIT";
                            currentAccessToken.AvailableTime = availableTime;

                            await backendDatabaseService.UpdateAccessToken(currentAccessToken);

                            await GetAvailableAccessToken("Changing token because limit is 50");
                        }

                        Console.WriteLine($"Reducing limit -> {limit}");
                    }

                    return;
                }
                else if (errorCode == 2)
                {
                    Console.WriteLine("Error: An unexpected error has occurred. Please retry your request later.");

                    await Task.Delay(1000 * 10);

                    return;
                }
                else if (errorCode == 613)
                {
                    Console.WriteLine("Error: Rate limit hit (OAuthException with code 613).");

                    if (response.Headers.Contains("x-business-use-case-usage"))
                    {
                        // Get the header value
                        var headerValue = response.Headers.GetValues("x-business-use-case-usage").FirstOrDefault();

                        if (!string.IsNullOrEmpty(headerValue))
                        {
                            try
                            {
                                // Parse the JSON in the header
                                var jsonHeader = JObject.Parse(headerValue);

                                // Assuming the structure in your example, get the first key and extract the estimated_time_to_regain_access
                                var firstKey = jsonHeader.Properties().First().Name;
                                var estimatedTime = jsonHeader[firstKey]?.FirstOrDefault()?["estimated_time_to_regain_access"]?.Value<int>();
                                var total_time = jsonHeader[firstKey]?.FirstOrDefault()?["total_time"]?.Value<int>();
                                var total_cputime = jsonHeader[firstKey]?.FirstOrDefault()?["total_cputime"]?.Value<int>();

                                int maxTime;
                                if (total_cputime > total_time)
                                    maxTime = (int)total_cputime;
                                else
                                    maxTime = (int)total_time;

                                if (estimatedTime.HasValue)
                                {
                                    Console.WriteLine($"Estimated time to regain access: {estimatedTime.Value} minutes");

                                    // Get the Lithuanian time zone
                                    var lithuanianTimeZone = TimeZoneInfo.FindSystemTimeZoneById("FLE Standard Time");
                                    var currentTimeInLithuania = TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, lithuanianTimeZone);

                                    int maxDelay = estimatedTime.Value;

                                    if (maxDelay < (maxTime - 90) * 10)
                                        maxDelay = (maxTime - 90) * 10;

                                    // Calculate the time when the access token will be available again
                                    DateTime availableTime = currentTimeInLithuania.AddMinutes(maxDelay);

                                    currentAccessToken.status = "LIMIT";
                                    currentAccessToken.AvailableTime = availableTime;

                                    await backendDatabaseService.UpdateAccessToken(currentAccessToken);
                                    Console.WriteLine($"Access token will be available again at: {availableTime} Lithuanian time. Delayed by {maxDelay}");

                                    rateLimitCount++;
                                    rateLimit = true;

                                    await GetAvailableAccessToken("Changing token because we got 613 error code.");
                                }
                                else
                                {
                                    Console.WriteLine("Estimated time to regain access not found.");
                                }
                            }
                            catch (Exception ex)
                            {
                                Console.WriteLine($"Error processing header: {ex.Message}");
                            }
                        }
                    }
                    else
                    {
                        Console.WriteLine("x-business-use-case-usage header not found.");
                    }
                }
                else
                {
                    Console.WriteLine("Unhandled error type, no specific processing needed.");
                }
            }
            catch (JsonReaderException ex)
            {
                // Handle JSON parsing errors specifically
                var errorMessage = $"Error: Response is not valid JSON. Response content: {jsonResponse}. Exception: {ex.Message}";
                Console.WriteLine(errorMessage);
                await Program.TerminateThisInstance(errorMessage);
            }
            catch (Exception ex)
            {
                var errorMessage = $"Error Processing JSON Response: {ex}. Response content: {jsonResponse}";
                Console.WriteLine(errorMessage);
                await Program.TerminateThisInstance(errorMessage);
            }

            if (!rateLimit)
                rateLimitCount = 0;

            if (rateLimitCount >= 3)
            {
                //Program.StopSlaveAndMarkError();
            }
        }