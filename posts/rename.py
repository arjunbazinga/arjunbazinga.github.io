import os

def rename_qmd_files(base_path):
    # Walk through all directories and files in the base_path
    for dirpath, dirnames, filenames in os.walk(base_path):
        # Get the folder name from the path
        folder_name = os.path.basename(dirpath)
        # Construct the filename that we expect to find
        target_file = f"{folder_name}.qmd"
        # Check if this file exists in the current directory
        if target_file in filenames:
            # Construct the full path to the existing file
            current_file_path = os.path.join(dirpath, target_file)
            # Construct the full path to the new file name
            new_file_path = os.path.join(dirpath, "index.qmd")
            # Rename the file
            os.rename(current_file_path, new_file_path)
            print(f"Renamed {current_file_path} to {new_file_path}")

# Example usage
base_directory = "/Users/arjunsrivastava/Documents/repos/arjunbazinga.github.io/arjunsriva.com/posts"
rename_qmd_files(base_directory)
