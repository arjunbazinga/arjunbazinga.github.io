import os
import shutil

# Set the path to your posts directory
posts_dir = '/Users/arjunsrivastava/Documents/repos/arjunbazinga.github.io/arjunsriva.com/posts'

# Iterate through each file in the directory
for filename in os.listdir(posts_dir):
    if filename.endswith('.md'):
        # Extract the date and post name from the filename
        y,m,d, postname_part = filename.split('-', 3)
        postname = postname_part.rsplit('.', 1)[0]
        date_part = f"{y}-{m}-{d}"

        
        # Read the contents of the file
        filepath = os.path.join(posts_dir, filename)
        with open(filepath, 'r') as file:
            contents = file.readlines()
        
        # Check if the --- exists to add date
        if '---' in contents[0]:
            header_index = contents.index('---\n', 1)  # Find the second occurrence of ---
            contents.insert(header_index, f'date: "{date_part}"\n')
        
        # Create new directory if it does not exist
        new_dir = os.path.join(posts_dir, postname)
        os.makedirs(new_dir, exist_ok=True)
        
        # Write the modified content to a new file with .qmd extension
        new_filepath = os.path.join(new_dir, f"{postname}.qmd")
        with open(new_filepath, 'w') as new_file:
            new_file.writelines(contents)
        
        # Optionally, delete the original file
        # os.remove(filepath)

print("Migration completed.")
