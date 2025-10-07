import React, { useState, useEffect } from "react";

export default function ApplyRewardPanel({ onApply, appliedReward, availableRewards }) {
    const [selected, setSelected] = useState(appliedReward || "none");

    useEffect(() => {
        setSelected(appliedReward || "none");
    }, [appliedReward]);

    return (
        <div style={{ margin: "1em 0", padding: "1em", border: "1px solid #eee", borderRadius: 8 }}>
            <h4>Apply Reward</h4>
            <select value={selected} onChange={e => setSelected(e.target.value)}>
                <option value="none">No reward</option>
                {availableRewards.includes("free_addon") && (
                    <option value="free_addon">Free Add-on</option>
                )}
                {availableRewards.includes("free_drink") && (
                    <option value="free_drink">Free Drink</option>
                )}
            </select>
            <button style={{ marginLeft: 8 }} onClick={() => onApply(selected)} disabled={selected === appliedReward}>
                Apply
            </button>
        </div>
    );
}
