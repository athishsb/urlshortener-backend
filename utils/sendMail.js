export const sendEmail = async ({ to, subject, text }) => {
    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "api-key": process.env.BREVO_API_KEY,
        },
        body: JSON.stringify({
            sender: {
                email: process.env.EMAIL_FROM_ADDRESS,
                name: process.env.EMAIL_FROM_NAME,
            },
            to: [{ email: to }],
            subject,
            textContent: text,
        }),
    });

    if (!response.ok) {
        const err = await response.json();
        console.error("Brevo error:", err);
        throw new Error(err.message || "Email sending failed");
    }

    return await response.json();
};