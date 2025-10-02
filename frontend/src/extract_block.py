from pathlib import Path
path = Path(r"frontend/src/App.jsx")
text = path.read_text()
start = text.index("    const handleLoginSubmit")
end = text.index("    const handleOrderLoginSubmit", start)
end2 = text.index(";", end)
block = text[start:end2+1]
print(block)
