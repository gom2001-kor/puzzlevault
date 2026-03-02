import random
import json
import os

def get_empty_neighbors(board, r, c, size):
    n = []
    for dr, dc in [(0,1), (1,0), (0,-1), (-1,0)]:
        nr, nc = r + dr, c + dc
        if 0 <= nr < size and 0 <= nc < size and board[nr][nc] == 0:
            n.append((nr, nc))
    return n

def generate_level(size, num_pairs):
    while True:
        board = [[0]*size for _ in range(size)]
        
        cells = [(r, c) for r in range(size) for c in range(size)]
        random.shuffle(cells)
        starts = cells[:num_pairs]
        
        heads = list(starts)
        for i, (r, c) in enumerate(starts):
            board[r][c] = i + 1
            
        active_colors = list(range(1, num_pairs + 1))
        
        while active_colors:
            c_idx = random.choice(active_colors)
            r, c = heads[c_idx - 1]
            
            neighbors = get_empty_neighbors(board, r, c, size)
                    
            if neighbors:
                neighbors.sort(key=lambda x: len(get_empty_neighbors(board, x[0], x[1], size)))
                best_n = len(get_empty_neighbors(board, neighbors[0][0], neighbors[0][1], size))
                candidates = [nx for nx in neighbors if len(get_empty_neighbors(board, nx[0], nx[1], size)) <= best_n + 1]
                
                nr, nc = random.choice(candidates)
                board[nr][nc] = c_idx
                heads[c_idx - 1] = (nr, nc)
            else:
                active_colors.remove(c_idx)
                
        full = True
        for r in range(size):
            if 0 in board[r]:
                full = False
                break
                
        if full:
            valid = True
            for i in range(num_pairs):
                # distance must be > 1 cell generally, but at least start != head
                if starts[i] == heads[i]:
                    valid = False
            if valid:
                pairs = []
                for i in range(num_pairs):
                    sr, sc = starts[i]
                    er, ec = heads[i]
                    pairs.append([sr, sc, er, ec, i + 1])
                return {"size": size, "pairs": pairs}

PACK_CONFIG = [
    {"size": 5, "levels": 30, "pairs": (4, 5)},
    {"size": 6, "levels": 30, "pairs": (5, 6)},
    {"size": 7, "levels": 30, "pairs": (6, 8)},
    {"size": 8, "levels": 30, "pairs": (8, 10)},
    {"size": 9, "levels": 30, "pairs": (10, 12)}
]

levels_data = {}

for pack in PACK_CONFIG:
    sz = pack["size"]
    print(f"Generating pack size {sz}...")
    levels_data[str(sz)] = []
    
    for lvl in range(pack["levels"]):
        pair_min, pair_max = pack["pairs"]
        num_pairs = random.randint(pair_min, pair_max)
        
        # Max colors logic based on grid space and rules
        level_obj = generate_level(sz, num_pairs)
        levels_data[str(sz)].append(level_obj)

output_js = "// Auto-generated ColorFlow Levels\n"
output_js += "const COLORFLOW_LEVELS = " + json.dumps(levels_data) + ";\n"

out_path = os.path.join("games", "colorflow-levels.js")
with open(out_path, "w", encoding="utf-8") as f:
    f.write(output_js)

print("All 150 levels generated and saved to colorflow-levels.js successfully!")

