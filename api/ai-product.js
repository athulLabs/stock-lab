export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed",
    });
  }

  try {
    const { name, size, price, category } = req.body || {};

    if (!name) {
      return res.status(400).json({
        error: "Product name is required",
      });
    }

    const token = process.env.CLOUDFLARE_API_TOKEN;
    const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;

    if (!token || !accountId) {
      return res.status(500).json({
        error: "Cloudflare AI is not configured yet.",
      });
    }

    const prompt = `
You are an AI inventory assistant for Stock Lab.

Create useful information for this product.

Product name: ${name}
Size: ${size || "Not specified"}
Price: ${price || "Not specified"}
Category: ${category || "Not specified"}

Return ONLY valid JSON using exactly this structure:

{
  "title": "professional short product title",
  "description": "short professional product description",
  "category": "best matching product category"
}

Rules:
- Keep the title short and professional.
- Keep the description concise.
- Choose a sensible category.
- Do not invent specifications, materials, brands, sizes, or features that were not provided.
- Do not add markdown.
- Return JSON only.
`;

    const response = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/@cf/meta/llama-3.1-8b-instruct-fast`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt,
          max_tokens: 300,
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error("Cloudflare AI error:", data);

      return res.status(500).json({
        error: "Cloudflare AI request failed.",
        details: data?.errors || null,
      });
    }

    const result = data?.result?.response;

    if (!result) {
      return res.status(500).json({
        error: "Cloudflare AI returned no result.",
      });
    }

    let aiData;

    try {
      aiData = JSON.parse(result);
    } catch {
      const jsonMatch = result.match(/\{[\s\S]*\}/);

      if (!jsonMatch) {
        return res.status(500).json({
          error: "AI returned invalid JSON.",
        });
      }

      try {
        aiData = JSON.parse(jsonMatch[0]);
      } catch {
        return res.status(500).json({
          error: "Could not parse AI response.",
        });
      }
    }

    return res.status(200).json({
      title: aiData.title || "",
      description: aiData.description || "",
      category: aiData.category || "",
    });
  } catch (error) {
    console.error("Stock Lab AI error:", error);

    return res.status(500).json({
      error:
        error instanceof Error
          ? error.message
          : "Something went wrong.",
    });
  }
}
