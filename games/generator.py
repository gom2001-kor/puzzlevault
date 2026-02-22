import random
import json
import os

def generate_board(size, min_pairs=4, max_pairs=6):
    # A simple randomized path carving algorithm to generate a fully covered board
    # and then extract the endpoints as a PuzzleVault "Flow" puzzle.
    
    # Grid initialization
    grid = [[0 for _ in range(size)] for _ in range(size)]
    empty_cells = size * size
    
    color = 1
    paths = {}
    
    def get_neighbors(r, c):
        nbs = []
        if r > 0: nbs.append((r-1, c))
        if r < size-1: nbs.append((r+1, c))
        if c > 0: nbs.append((r, c-1))
        if c < size-1: nbs.append((r, c+1))
        random.shuffle(nbs)
        return nbs

    failed_starts = set()
    while empty_cells > 0 and color <= max_pairs:
        # Find a random empty start cell
        starts = [(r, c) for r in range(size) for c in range(size) if grid[r][c] == 0 and (r, c) not in failed_starts]
        if not starts:
            break
            
        r, c = random.choice(starts)
        path = [(r, c)]
        grid[r][c] = color
        empty_cells -= 1
        
        # Random walk length
        target_len = random.randint(3, size*2)
        
        while len(path) < target_len:
            cr, cc = path[-1]
            valid_nbs = [(nr, nc) for nr, nc in get_neighbors(cr, cc) if grid[nr][nc] == 0]
            if not valid_nbs:
                break
                
            nr, nc = random.choice(valid_nbs)
            path.append((nr, nc))
            grid[nr][nc] = color
            empty_cells -= 1
            
        if len(path) > 1:
            paths[color] = path
            color += 1
        else:
            # Revert if it's a 1-length dot
            grid[r][c] = 0
            empty_cells += 1
            failed_starts.add((r, c))
            
    # Sometimes we don't hit 100% or don't have enough colors. 
    # For a real puzzle, we want 100% coverage, but for this demo script
    # we'll accept anything that has at least min_pairs.
    if len(paths) >= min_pairs:
        # Format: [r1, c1, r2, c2, color]
        pairs = []
        for col, p in paths.items():
            start = p[0]
            end = p[-1]
            pairs.append([start[0], start[1], end[0], end[1], col])
        return {"size": size, "pairs": pairs, "coverage": ((size*size - empty_cells)/(size*size))}
    return None

def main():
    print("Generating ColorFlow puzzles...")
    dataset = {}
    
    # Pack 1 (5x5), Pack 2 (6x6), etc.
    # Color limits per prompt.
    configs = [
        (5, 30, 4, 5), # size 5, 30 levels, 4-5 pairs
        (6, 30, 5, 6),
        (7, 30, 5, 7),
        (8, 30, 6, 8),
        # Generous stubs for the rest to ensure game works without crashing
        (9, 5, 6, 9),
        (10, 5, 6, 9),
        (12, 5, 6, 9),
        (14, 5, 6, 9)
    ]
    
    for size, count, min_c, max_c in configs:
        levels = []
        attempts = 0
        while len(levels) < count and attempts < 5000:
            attempts += 1
            pz = generate_board(size, min_c, max_c)
            # Try to get highest coverage puzzles
            if pz and pz['coverage'] > 0.8:
                # Remove coverage metadata for raw output
                del pz['coverage']
                levels.append(pz)
                
        dataset[size] = levels
        print(f"Generated {len(levels)} puzzles for size {size}x{size}")

    js_content = f"// Auto-generated ColorFlow Levels\nconst COLORFLOW_LEVELS = {json.dumps(dataset)};\n"
    
    target_path = os.path.join(os.path.dirname(__file__), "colorflow-levels.js")
    with open(target_path, "w") as f:
        f.write(js_content)
    print(f"Saved to {target_path}")

if __name__ == "__main__":
    main()
