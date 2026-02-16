import os

replacements = {
    "text-gold": "text-accent",
    "badge-gold": "badge-accent",
    "btn-gold": "btn-accent",
    "var(--color-gold)": "var(--color-olive)",
    "var(--color-gold-light)": "var(--color-olive-light)",
    "var(--color-gold-dark)": "var(--color-olive-dark)",
    "rgba(212, 175, 55,": "rgba(47, 79, 62,",
    "rgba(184, 149, 106,": "rgba(47, 79, 62," 
}

print("Starting replacement...")
for root, dirs, files in os.walk("frontend"):
    if "node_modules" in dirs:
        dirs.remove("node_modules") # Optimization
    
    for file in files:
        if file.endswith((".html", ".css", ".js")):
            path = os.path.join(root, file)
            try:
                with open(path, "r", encoding="utf-8") as f:
                    content = f.read()
                
                new_content = content
                for old, new in replacements.items():
                    new_content = new_content.replace(old, new)
                
                if new_content != content:
                    print(f"Updating {path}")
                    with open(path, "w", encoding="utf-8") as f:
                        f.write(new_content)
            except Exception as e:
                print(f"Error processing {path}: {e}")
print("Replacement complete.")
