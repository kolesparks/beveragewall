



type OpenRouterResponse = {
    "id": string;
    "provider": string;
    "model": string;
    "object": string;
    "created": number;
    "choices": {
        "logprobs": null;
        "finish_reason": string;
        "native_finish_reason": string;
        "index": number;
        "message": {
            "role": string;
            "content": string;
            "refusal": null,
            "reasoning": null
        }
    }[],
    "usage": {
        "prompt_tokens": number,
        "completion_tokens": number,
        "total_tokens": number,
        "cost": number,
        "is_byok": boolean,
        "prompt_tokens_details": {
            "cached_tokens": number,
            "audio_tokens": number,
            "video_tokens": number
        },
        "cost_details": {
            "upstream_inference_cost": null | number,
            "upstream_inference_prompt_cost": number,
            "upstream_inference_completions_cost": number
        },
        "completion_tokens_details": {
            "reasoning_tokens": number,
            "image_tokens": number
        }
    }
}



export async function classifyIsBeverageImage(base64Image: string) {

    const fetchResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            model: 'google/gemma-3-12b-it',
            messages: [
                {
                    role: 'user',
                    content: [
                        {
                            type: 'text',
                            text: "Is this image SOLEY of a beverage (e.g. water, beer, wine, soda, coffee), held in a hand(s) OR placed on surface (e.g. table, window, bar), in front of a generic backdrop (e.g. wall, floor, sky, building), and does NOT include the face of any person? Answer 'yes' if so, or 'no' if not."
                        },
                        {
                            type: 'image_url',
                            image_url: {
                                url: base64Image,
                            },
                        },
                    ],
                },
            ],
            "temperature": 0.1,
            "max_tokens": 20
        }),
    });

    const openRouterResposne = await fetchResponse.json() as OpenRouterResponse;


    return openRouterResposne.choices?.[0]?.message?.content?.toLowerCase().includes("yes") ? true : false;
}