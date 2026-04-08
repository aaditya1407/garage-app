import os
import re

def update_imports(root_dir):
    for root, dirs, files in os.walk(root_dir):
        for file in files:
            if file.endswith('.tsx') or file.endswith('.ts'):
                path = os.path.join(root, file)
                with open(path, 'r', encoding='utf-8') as f:
                    content = f.read()
                
                # Replace imports from RootNavigator to types
                new_content = re.sub(
                    r"from (['\"])([./]+)navigation/RootNavigator(['\"])",
                    r"from \1\2navigation/types\3",
                    content
                )
                
                if new_content != content:
                    with open(path, 'w', encoding='utf-8') as f:
                        f.write(new_content)
                    print(f"Updated {path}")

if __name__ == "__main__":
    update_imports('src')
