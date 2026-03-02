import json
import sys

size = 5
pairs = [
    [4, 1, 4, 0, 1],
    [0, 4, 0, 1, 2],
    [3, 4, 2, 2, 3],
    [2, 4, 1, 4, 4]
]

board = [0] * (size * size)
endpoints = [0] * (size * size)

for p in pairs:
    c = p[4]
    endpoints[p[0]*size + p[1]] = c
    endpoints[p[2]*size + p[3]] = c
    board[p[0]*size + p[1]] = c
    board[p[2]*size + p[3]] = c

def print_solution(board_st, order_map):
    empty_cnt = board_st.count(0)
    cov = round((25-empty_cnt)/25*100)
    print(f'Found solution! Coverage: {cov}%')
    
    colors = {1: '#F43F5E', 2: '#2563EB', 3: '#059669', 4: '#D97706'}
    html = '''
    <!DOCTYPE html>
    <html><head><style>
        body { font-family: sans-serif; display:flex; justify-content:center; align-items:center; height:100vh; background:#f8fafc; margin:0; }
        .grid { display:grid; grid-template-columns:repeat(5, 60px); grid-template-rows:repeat(5, 60px); gap:2px; background:#e2e8f0; border:4px solid #1E293B; padding:4px; border-radius:12px; }
        .cell { width:60px; height:60px; display:flex; justify-content:center; align-items:center; color:white; font-size: 20px; font-weight:bold; position:relative; }
        .order { font-size: 14px; position:absolute; top:2px; left:4px; opacity:0.8; }
    </style></head>
    <body style="text-align:center;">
        <div>
            <h2 style="color:#1E293B">Pack 1 - Level 17 (Coverage: ''' + str(cov) + '''%)</h2>
            <div class="grid">
    '''
    for i in range(size * size):
        c = board_st[i]
        bg = colors.get(c, '#fff')
        is_end = endpoints[i] > 0
        content = '♦' if is_end else '●'
        if c == 0: content = ''
        
        ord_num = ''
        if c in order_map and i in order_map[c]:
            ord_num = order_map[c][i]
            
        rad = '12px' if is_end else '0'
        html += f'<div class="cell" style="background:{bg}; border-radius:{rad};"><span class="order">{ord_num}</span>{content}</div>'
        
    html += '''</div></div></body></html>'''
    
    with open('solution.html', 'w', encoding='utf-8') as f:
        f.write(html)
    sys.exit()

def solve(color_idx, r, c, current_path, order_map):
    if color_idx > 4:
        print_solution(board, order_map)
        return
        
    p = pairs[color_idx - 1]
    tr, tc = p[2], p[3]
    color = p[4]
    
    if r == tr and c == tc:
        if color_idx < 4:
            np = pairs[color_idx]
            order_map[np[4]] = {np[0]*size + np[1]: 1}
            solve(color_idx + 1, np[0], np[1], [np[0]*size + np[1]], order_map)
            del order_map[np[4]]
        else:
            solve(color_idx + 1, -1, -1, current_path, order_map)
        return

    for dr, dc in [(0,1), (1,0), (0,-1), (-1,0)]:
        nr, nc = r + dr, c + dc
        if 0 <= nr < size and 0 <= nc < size:
            idx = nr * size + nc
            if board[idx] == 0 or (nr == tr and nc == tc and endpoints[idx] == color):
                prev = board[idx]
                board[idx] = color
                new_path = list(current_path)
                new_path.append(idx)
                
                new_order_map = {k: dict(v) for k, v in order_map.items()}
                new_order_map[color][idx] = len(new_path)
                
                solve(color_idx, nr, nc, new_path, new_order_map)
                
                board[idx] = prev

solve(1, pairs[0][0], pairs[0][1], [pairs[0][0]*size + pairs[0][1]], {1: {pairs[0][0]*size + pairs[0][1]: 1}})
