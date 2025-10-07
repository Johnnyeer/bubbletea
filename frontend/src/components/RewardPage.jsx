import React, { useState, useEffect } from "react";

export default function RewardPage({ user }) {
    const [drinkCount, setDrinkCount] = useState(0);
    const [redeemStatus, setRedeemStatus] = useState("");
    const [isRedeeming, setIsRedeeming] = useState(false);

    useEffect(() => {
        async function fetchDrinkCount() {
            try {
                const res = await fetch("/api/orders/rewards", {
                    headers: { Authorization: `Bearer ${window.localStorage.getItem("jwt")}` },
                });
                const data = await res.json();
                if (res.ok && typeof data.drink_count === "number") {
                    setDrinkCount(data.drink_count);
                } else {
                    setDrinkCount(0);
                }
            } catch {
                setDrinkCount(0);
            }
        }
        fetchDrinkCount();
    }, [user]);

    let rewardMsg = "Order more drinks to unlock rewards!";
    let canRedeem = false;
    let rewardType = "";
    if (drinkCount >= 10) {
        rewardMsg = "🎉 You earned a FREE DRINK! Redeem on your next order.";
        canRedeem = true;
        rewardType = "free_drink";
    } else if (drinkCount >= 5) {
        rewardMsg = "🎉 You earned a FREE ADD-ON! Redeem on your next order.";
        canRedeem = true;
        rewardType = "free_addon";
    }

    async function handleRedeem() {
        setIsRedeeming(true);
        setRedeemStatus("");
        try {
            const res = await fetch("/api/orders/rewards/redeem", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${window.localStorage.getItem("jwt")}`,
                },
                body: JSON.stringify({ type: rewardType }),
            });
            const data = await res.json();
            if (res.ok && data.success) {
                setRedeemStatus("Reward redeemed! You can use it on your next order.");
            } else {
                setRedeemStatus(data.error || "Unable to redeem reward.");
            }
        } catch {
            setRedeemStatus("Unable to redeem reward.");
        }
        setIsRedeeming(false);
    }

    return (
        <div className="tea-reward-page">
            <h2>Rewards</h2>
            <p>Welcome, {user?.full_name || user?.username || "Member"}!</p>
            <p>You have ordered <strong>{drinkCount}</strong> drinks.</p>
            <div style={{ margin: "1em 0", fontWeight: "bold" }}>{rewardMsg}</div>
            {canRedeem && (
                <button onClick={handleRedeem} disabled={isRedeeming} style={{ marginBottom: "1em" }}>
                    {isRedeeming ? "Redeeming..." : "Redeem Reward"}
                </button>
            )}
            {redeemStatus && <div style={{ color: "green", marginBottom: "1em" }}>{redeemStatus}</div>}
            <ul>
                <li>After 5 drinks: Free add-on</li>
                <li>After 10 drinks: Free drink</li>
            </ul>
        </div>
    );
}
