import { useMemo, useState } from "react";
import {
    cardStyle,
    inputStyle,
    labelStyle,
    primaryButtonStyle,
    secondaryButtonStyle,
} from "./styles.js";

const initialFormState = {
    fullName: "",
    email: "",
    password: "",
    confirmPassword: "",
};

export default function RegisterPage({ navigate }) {
    const [form, setForm] = useState(initialFormState);
    const [statusMessage, setStatusMessage] = useState("");
    const [errorMessage, setErrorMessage] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleChange = event => {
        const { name, value } = event.target;
        setForm(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async event => {
        event.preventDefault();
        setErrorMessage("");
        setStatusMessage("");

        if (form.password !== form.confirmPassword) {
            setErrorMessage("Passwords do not match.");
            return;
        }

        const payload = {
            full_name: form.fullName.trim(),
            email: form.email.trim().toLowerCase(),
            password: form.password,
            role: "customer",
        };

        if (!payload.full_name || !payload.email || !payload.password) {
            setErrorMessage("Please complete all required fields.");
            return;
        }

        setIsSubmitting(true);
        setStatusMessage("Creating your account...");

        try {
            const response = await fetch("/api/auth/register", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            const data = await response.json().catch(() => ({}));
            if (!response.ok) {
                throw new Error(data.error || "Unable to create account.");
            }

            setStatusMessage("Account created! You can sign in from the order page.");
            setForm(initialFormState);
        } catch (error) {
            setErrorMessage(error.message);
            setStatusMessage("");
        } finally {
            setIsSubmitting(false);
        }
    };

    const feedbackStyles = useMemo(() => {
        const borderColor = errorMessage ? "#fca5a5" : "#bfdbfe";
        const background = errorMessage ? "#fee2e2" : "#e0f2fe";
        const textColor = errorMessage ? "#b91c1c" : "#1e3a8a";
        return {
            border: "1px solid " + borderColor,
            background,
            borderRadius: 12,
            padding: 16,
            color: textColor,
        };
    }, [errorMessage]);

    return (
        <div className="order-page">
            <main className="order-page__main">
                <div className="order-page__inner">
                    <section className="order-page__intro">
                        <h2>Join our membership</h2>
                        <p>
                            Create an account to unlock exclusive perks and keep your favourites at
                            your fingertips.
                        </p>
                        <div style={{ marginTop: 12 }}>
                            <button
                                type="button"
                                onClick={() => navigate("/order")}
                                style={{
                                    ...secondaryButtonStyle,
                                    padding: "8px 18px",
                                    fontWeight: 600,
                                }}
                            >
                                Back to ordering
                            </button>
                        </div>
                    </section>

                    <section style={{ ...cardStyle, display: "grid", gap: 16 }}>
                        <div>
                            <h3 style={{ margin: 0, fontSize: 24 }}>Create your account</h3>
                            <p style={{ margin: "8px 0 0 0", color: "#4a5568", fontSize: 15 }}>
                                We just need a few details to set things up.
                            </p>
                        </div>
                        <form onSubmit={handleSubmit} style={{ display: "grid", gap: 16 }}>
                            <label style={labelStyle}>
                                Full name
                                <input
                                    type="text"
                                    name="fullName"
                                    value={form.fullName}
                                    onChange={handleChange}
                                    required
                                    style={inputStyle}
                                />
                            </label>
                            <label style={labelStyle}>
                                Email
                                <input
                                    type="email"
                                    name="email"
                                    value={form.email}
                                    onChange={handleChange}
                                    required
                                    style={inputStyle}
                                />
                            </label>
                            <label style={labelStyle}>
                                Password
                                <input
                                    type="password"
                                    name="password"
                                    value={form.password}
                                    onChange={handleChange}
                                    required
                                    style={inputStyle}
                                />
                            </label>
                            <label style={labelStyle}>
                                Confirm password
                                <input
                                    type="password"
                                    name="confirmPassword"
                                    value={form.confirmPassword}
                                    onChange={handleChange}
                                    required
                                    style={inputStyle}
                                />
                            </label>
                            <button
                                type="submit"
                                disabled={isSubmitting}
                                style={{
                                    ...primaryButtonStyle,
                                    padding: "10px 18px",
                                    opacity: isSubmitting ? 0.7 : 1,
                                    cursor: isSubmitting ? "wait" : "pointer",
                                }}
                            >
                                {isSubmitting ? "Creating account..." : "Create account"}
                            </button>
                        </form>

                        {(errorMessage || statusMessage) && (
                            <div style={feedbackStyles}>{errorMessage || statusMessage}</div>
                        )}
                    </section>
                </div>
            </main>
        </div>
    );
}
