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
You are an inventory assistant.

Create information for this product:

Product name: ${name}
Size: ${size || "Not specified"}
Price: ${price || "Not specified"}
Category: ${category || "Not specified"}

Return ONLY valid JSON in this exact format:

{
  "title": "short professional product title",
  "description": "short useful product description",
  "category": "best product category"
}

Keep the description concise and suitable for an inventory/e-commerce app.
Do not invent technical specifications that were not provided.
`;

    const response = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/@cf/meta/llama-3.1-8b-instruct`,
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
      console.error("Cloudflare error:", data);

      return res.status(500).json({
        error: "Cloudflare AI request failed.",
      });
    }

    const result = data?.result?.response;

    if (!result) {
      return res.status(500).json({
        error: "AI returned no result.",
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

      aiData = JSON.parse(jsonMatch[0]);
    }

    return res.status(200).json(aiData);
  } catch (error) {
    console.error("AI product error:", error);

    return res.status(500).json({
      error: "Something went wrong.",
    });
  }
}
