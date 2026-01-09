
from flask import Flask, render_template, request, jsonify, redirect, url_for, flash
import sqlite3
import os
import re
import json
import traceback
from datetime import datetime
from PIL import Image  # For checking image dimensions
from flask_cors import cross_origin  # For stability - it used to only work on some versions of chrome

# Initialize the Flask application
app = Flask(__name__)
app.secret_key = 'mapfolio_secret_key_2024'  # Required for flash messages

# Define the folder to store uploaded images
UPLOAD_FOLDER = 'static/uploads'
os.makedirs(UPLOAD_FOLDER, exist_ok=True)  # Create the upload folder if it doesn't exist

# Image size and dimension limits
MAX_SIZE_MB = 4  # Increased for better quality
MIN_WIDTH = 800
MIN_HEIGHT = 600
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'webp'}


# Initialize the database with a table called 'pins'
def init_db():
    conn = sqlite3.connect('archive.db', timeout=30)
    c = conn.cursor()

    # 更稳的 SQLite 设置（WAL 多读单写；适度同步；默认 30s 等待）
    c.execute("PRAGMA journal_mode=WAL")
    c.execute("PRAGMA synchronous=NORMAL")
    c.execute("PRAGMA busy_timeout=30000")

    # --- pins 主表 ---
    c.execute('''
        CREATE TABLE IF NOT EXISTS pins (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            description TEXT NOT NULL,
            author TEXT NOT NULL,
            lat REAL NOT NULL,
            lng REAL NOT NULL,
            image_path TEXT NOT NULL,
            timestamp TEXT NOT NULL,
            likes INTEGER DEFAULT 0,
            pin_code TEXT NOT NULL,
            project_type TEXT DEFAULT 'Other',
            year TEXT DEFAULT '',
            full_credit TEXT DEFAULT ''
        )
    ''')

    # 兼容老库：没有就补列（已存在会报错，所以 try/except 忽略）
    try: c.execute("ALTER TABLE pins ADD COLUMN pin_code TEXT DEFAULT ''")
    except: pass
    try: c.execute("ALTER TABLE pins ADD COLUMN project_type TEXT DEFAULT 'Other'")
    except: pass
    try: c.execute("ALTER TABLE pins ADD COLUMN year TEXT DEFAULT ''")
    except: pass
    try: c.execute("ALTER TABLE pins ADD COLUMN full_credit TEXT DEFAULT ''")
    except: pass
    try: c.execute("ALTER TABLE pin_images ADD COLUMN image_description TEXT DEFAULT ''")
    except: pass
    try: c.execute("ALTER TABLE pins ADD COLUMN image_description TEXT DEFAULT ''")
    except: pass

    # --- 画廊表 ---
    c.execute('''
        CREATE TABLE IF NOT EXISTS pin_images (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            pin_id INTEGER NOT NULL,
            image_path TEXT NOT NULL,
            image_description TEXT DEFAULT '',
            order_index INTEGER DEFAULT 0,
            FOREIGN KEY (pin_id) REFERENCES pins (id) ON DELETE CASCADE
        )
    ''')

    # 兼容老库：补上 order_index
    try: c.execute("ALTER TABLE pin_images ADD COLUMN order_index INTEGER DEFAULT 0")
    except: pass

    # --- 反馈表 ---
    c.execute('''
        CREATE TABLE IF NOT EXISTS feedback (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT,
            message TEXT NOT NULL,
            timestamp TEXT NOT NULL,
            rating INTEGER DEFAULT 5
        )
    ''')

    conn.commit()
    conn.close()

def db_connect():
    conn = sqlite3.connect('archive.db', timeout=30)
    # busy_timeout 需要每个连接都设；WAL 在库级别一次性生效即可
    conn.execute("PRAGMA busy_timeout=30000")
    return conn

    conn = sqlite3.connect('archive.db')
    c = conn.cursor()

    # Main table for pins
    c.execute('''
        CREATE TABLE IF NOT EXISTS pins (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            description TEXT NOT NULL,
            author TEXT NOT NULL,
            lat REAL NOT NULL,
            lng REAL NOT NULL,
            image_path TEXT NOT NULL,
            timestamp TEXT NOT NULL,
            likes INTEGER DEFAULT 0,
            pin_code TEXT NOT NULL,
            project_type TEXT DEFAULT 'Other',
            year TEXT DEFAULT '',
            full_credit TEXT DEFAULT ''
        )
    ''')

    # ✅ Add new columns if they don't exist (for existing databases)
    try:
        c.execute("ALTER TABLE pins ADD COLUMN pin_code TEXT DEFAULT ''")
    except:
        pass
    try:
        c.execute("ALTER TABLE pins ADD COLUMN project_type TEXT DEFAULT 'Other'")
    except:
        pass
    try:
        c.execute("ALTER TABLE pins ADD COLUMN year TEXT DEFAULT ''")
    except:
        pass
    try:
        c.execute("ALTER TABLE pins ADD COLUMN full_credit TEXT DEFAULT ''")
    except:
        pass
    try:
        c.execute("ALTER TABLE pin_images ADD COLUMN image_description TEXT DEFAULT ''")
    except:
        pass

    # Table for detailed images
    c.execute('''
        CREATE TABLE IF NOT EXISTS pin_images (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            pin_id INTEGER NOT NULL,
            image_path TEXT NOT NULL,
            image_description TEXT DEFAULT '',
            order_index INTEGER DEFAULT 0,
            FOREIGN KEY (pin_id) REFERENCES pins (id) ON DELETE CASCADE
        )
    ''')
       # ✅ 给老的 pin_images 表补上 order_index 列
    try:
        c.execute("ALTER TABLE pin_images ADD COLUMN order_index INTEGER DEFAULT 0")
    except:
        pass

    # Table for feedback
    c.execute('''
        CREATE TABLE IF NOT EXISTS feedback (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT,
            message TEXT NOT NULL,
            timestamp TEXT NOT NULL,
            rating INTEGER DEFAULT 5
        )
    ''')

    conn.commit()
    conn.close()

    conn = sqlite3.connect('archive.db')
    c = conn.cursor()

    # Main table for pins
    c.execute('''
        CREATE TABLE IF NOT EXISTS pins (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            description TEXT NOT NULL,
            author TEXT NOT NULL,
            lat REAL NOT NULL,
            lng REAL NOT NULL,
            image_path TEXT NOT NULL,
            timestamp TEXT NOT NULL,
            likes INTEGER DEFAULT 0,
            pin_code TEXT NOT NULL,
            project_type TEXT DEFAULT 'Other',
            year TEXT DEFAULT '',
            full_credit TEXT DEFAULT ''
        )
    ''')
    
    # Add new columns if they don't exist (for existing databases)
    try:
        c.execute("ALTER TABLE pins ADD COLUMN pin_code TEXT DEFAULT ''")
    except:
        pass
    try:
        c.execute("ALTER TABLE pins ADD COLUMN project_type TEXT DEFAULT 'Other'")
    except:
        pass
    try:
        c.execute("ALTER TABLE pins ADD COLUMN year TEXT DEFAULT ''")
    except:
        pass
    try:
        c.execute("ALTER TABLE pins ADD COLUMN full_credit TEXT DEFAULT ''")
    except:
        pass
    try:
        c.execute("ALTER TABLE pin_images ADD COLUMN image_description TEXT DEFAULT ''")
    except:
        pass


    # Table for detailed images (associated with each pin)
    c.execute('''
        CREATE TABLE IF NOT EXISTS pin_images (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            pin_id INTEGER NOT NULL,
            image_path TEXT NOT NULL,
            image_description TEXT DEFAULT '',
            order_index INTEGER DEFAULT 0,
            FOREIGN KEY (pin_id) REFERENCES pins (id) ON DELETE CASCADE
        )
    ''')

    # Table for feedback
    c.execute('''
        CREATE TABLE IF NOT EXISTS feedback (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT,
            message TEXT NOT NULL,
            timestamp TEXT NOT NULL,
            rating INTEGER DEFAULT 5
        )
    ''')

    conn.commit()
    conn.close()


# Ensure database and table are created when app starts
init_db()

# Route for the landing animation or welcome page
@app.route('/')
def landing():
    return render_template('landing.html')  # Render landing page template

# Route for the main map interface
@app.route('/map')
def map_page():
    return render_template('map.html')  # Render map page with pins

# Route for the project list page
@app.route('/list')
def project_list():
    conn = sqlite3.connect('archive.db')
    c = conn.cursor()
    c.execute("SELECT * FROM pins ORDER BY RANDOM()")  # Get all pins, newest first
    pins = c.fetchall()
    conn.close()
    return render_template('list.html', pins=pins)

# Route for About and Manual page
@app.route('/about')
def about():
    return render_template('about.html')

# Route for Feedbacks page
@app.route('/feedback', methods=['GET', 'POST'])
def feedback():
    if request.method == 'POST':
        name = request.form.get('name', '').strip()
        email = request.form.get('email', '').strip()
        message = request.form.get('message', '').strip()
        rating = int(request.form.get('rating', 5))
        
        if not name or not message:
            flash('Name and message are required.', 'error')
            return render_template('feedback.html')
        
        # Validate email format if provided
        if email and not re.match(r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$', email):
            flash('Please enter a valid email address.', 'error')
            return render_template('feedback.html')
        
        # Save feedback to database
        conn = sqlite3.connect('archive.db')
        c = conn.cursor()
        timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        
        c.execute("""
            INSERT INTO feedback (name, email, message, timestamp, rating)
            VALUES (?, ?, ?, ?, ?)
        """, (name, email, message, timestamp, rating))
        
        conn.commit()
        conn.close()
        
        flash('Thank you for your feedback!', 'success')
        return redirect(url_for('feedback'))
    
    return render_template('feedback.html')

# Route for PIN verification
@app.route('/verify-pin/<int:pin_id>', methods=['POST'])
def verify_pin(pin_id):
    try:
        data = request.get_json()
        pin_code = data.get('pin_code', '').strip()
        
        if not pin_code or len(pin_code) != 4:
            return jsonify({'success': False, 'message': 'Invalid PIN format'})
        
        # Check if PIN matches
        conn = sqlite3.connect('archive.db')
        c = conn.cursor()
        c.execute("SELECT pin_code FROM pins WHERE id = ?", (pin_id,))
        result = c.fetchone()
        conn.close()
        
        if result and result[0] == pin_code:
            return jsonify({'success': True})
        else:
            return jsonify({'success': False, 'message': 'Invalid PIN code'})
            
    except Exception as e:
        return jsonify({'success': False, 'message': 'Error verifying PIN'})

# allowed file to upload


def allowed_file(filename):
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


def sanitize_filename(name):
    """Sanitize filename by removing special characters and converting to lowercase."""
    return re.sub(r'[^a-zA-Z0-9_-]', '_', (name or '').strip().lower())


# Route to handle both GET (form display) and POST (form submission) for uploading pins
@app.route('/upload', methods=['POST'])
@cross_origin()
def upload():
    def validate_pin_code(pin_code):
        return re.match(r'^\d{4}$', pin_code or '') is not None

    # 1) 表单校验 ---------------------------------------------------------------
    required = ['title', 'description', 'author', 'lat', 'lng', 'pin_code']
    for f in required:
        if not request.form.get(f, '').strip():
            return jsonify({'error': f'{f} is required'}), 400

    if not validate_pin_code(request.form.get('pin_code')):
        return jsonify({'error': 'PIN code must be exactly 4 digits'}), 400

    try:
        lat = float(request.form['lat'])
        lng = float(request.form['lng'])
        if not (-90 <= lat <= 90 and -180 <= lng <= 180):
            return jsonify({'error': 'Invalid coordinates'}), 400
    except Exception:
        return jsonify({'error': 'Invalid coordinates format'}), 400

    if 'image' not in request.files or request.files['image'].filename == '':
        return jsonify({'error': 'Main image is required'}), 400

    main_image = request.files['image']
    if not allowed_file(main_image.filename):
        return jsonify({'error': 'Invalid file format. Allowed: PNG, JPG, JPEG, GIF, WEBP'}), 400

    # 2) 读取字段 ---------------------------------------------------------------
    title = request.form['title'].strip()
    description = request.form['description'].strip()
    author = request.form['author'].strip()
    pin_code = request.form['pin_code'].strip()
    project_type = request.form.get('project_type', 'Other').strip() or 'Other'
    year = request.form.get('year', '').strip()
    # 修正：full_credit 应该从 full_credit 字段取，默认回退 author
    full_credit = request.form.get('full_credit', author).strip()
    # 新增：thumbnail_description 用于描述缩略图
    thumbnail_description = request.form.get('thumbnail_description', '').strip()
    timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S')

    safe_title = sanitize_filename(title)

    # 3) 先把图片都处理好（此阶段不打开数据库，避免锁） -------------------------
    processed_main_path = None
    processed_gallery_paths = []

    # 3.1 主图
    try:
        ext = main_image.filename.rsplit('.', 1)[1].lower()
        count = 1
        while True:
            filename = f"{safe_title}_{count}.{ext}"
            filepath = os.path.join(UPLOAD_FOLDER, filename)
            if not os.path.exists(filepath):
                break
            count += 1

        main_image.seek(0)
        img = Image.open(main_image)
        
        # 检查是否为 GIF 动画
        is_gif = ext == 'gif' and hasattr(img, 'is_animated') and img.is_animated
        
        # 仅对非 GIF 动画图片做颜色转换
        if not is_gif and img.mode in ('RGBA', 'LA', 'P'):
            img = img.convert('RGB')

        w, h = img.size
        if w < MIN_WIDTH or h < MIN_HEIGHT:
            img = img.resize((MIN_WIDTH, MIN_HEIGHT), Image.Resampling.LANCZOS)

        # 如果是 GIF 动画，直接保存
        if is_gif:
            main_image.seek(0)
            with open(filepath, 'wb') as f:
                f.write(main_image.read())
        else:
            # 如果源文件>4MB，先缩一轮长边 1200
            main_image.seek(0, os.SEEK_END)
            if main_image.tell() > MAX_SIZE_MB * 1024 * 1024:
                img.thumbnail((1200, 1200), Image.Resampling.LANCZOS)

            quality = 90
            while True:
                img.save(filepath, optimize=True, quality=quality)
                if os.path.getsize(filepath) <= MAX_SIZE_MB * 1024 * 1024 or quality <= 30:
                    break
                quality -= 5

        processed_main_path = filepath.replace('\\', '/')
    except Exception as e:
        # 主图失败就直接返回
        if os.path.exists(filepath):
            os.remove(filepath)
        return jsonify({'error': f'Error processing main image: {e}'}), 500

    # 3.2 画廊
    try:
        gallery_files = request.files.getlist('details') if 'details' in request.files else []
        # 新增：逐图的名称数组（与 files 对齐）
        gallery_descs = request.form.getlist('image_descriptions[]') or []
        for i, detail in enumerate(gallery_files):
            if not (detail and detail.filename and allowed_file(detail.filename)):
                continue

            ext = detail.filename.rsplit('.', 1)[1].lower()
            detail_filename = f"{safe_title}_detail_{i+1}.{ext}"
            detail_path = os.path.join(UPLOAD_FOLDER, detail_filename)

            detail.seek(0)
            di = Image.open(detail)
            
            # 检查是否为 GIF 动画
            is_gif = ext == 'gif' and hasattr(di, 'is_animated') and di.is_animated
            
            # 仅对非 GIF 动画图片做颜色转换
            if not is_gif and di.mode in ('RGBA', 'LA', 'P'):
                di = di.convert('RGB')

            # 如果是 GIF 动画，直接保存
            if is_gif:
                detail.seek(0)
                with open(detail_path, 'wb') as f:
                    f.write(detail.read())
            else:
                dw, dh = di.size
                if dw < MIN_WIDTH or dh < MIN_HEIGHT:
                    di = di.resize((MIN_WIDTH, MIN_HEIGHT), Image.Resampling.LANCZOS)

                detail.seek(0, os.SEEK_END)
                if detail.tell() > MAX_SIZE_MB * 1024 * 1024:
                    di.thumbnail((1200, 1200), Image.Resampling.LANCZOS)

                q = 90
                while True:
                    di.save(detail_path, optimize=True, quality=q)
                    if os.path.getsize(detail_path) <= MAX_SIZE_MB * 1024 * 1024 or q <= 30:
                        break
                    q -= 5

            # 取该图对应的名称（越界则给空串）
            per_image_desc = gallery_descs[i] if i < len(gallery_descs) else ''
            processed_gallery_paths.append((detail_path.replace('\\', '/'), per_image_desc))
    except Exception as e:
        # 清理主图，再报错
        if processed_main_path and os.path.exists(processed_main_path):
            os.remove(processed_main_path)
        for p, _ in processed_gallery_paths:
            if os.path.exists(p):
                os.remove(p)
        return jsonify({'error': f'Error processing gallery: {e}'}), 500

    # 4) 再打开数据库，快速写入 ---------------------------------------------------
    try:
        conn = db_connect()
        c = conn.cursor()

        c.execute("""
            INSERT INTO pins (title, description, author, lat, lng, image_path, timestamp, pin_code, project_type, year, full_credit, image_description)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (title, description, author, lat, lng, processed_main_path, timestamp, pin_code, project_type, year, full_credit, thumbnail_description))
        pin_id = c.lastrowid

        for i, (p, per_desc) in enumerate(processed_gallery_paths):
            c.execute("INSERT INTO pin_images (pin_id, image_path, image_description, order_index) VALUES (?, ?, ?, ?)", (pin_id, p, per_desc, i))

        conn.commit()
        conn.close()
        return jsonify({'success': True, 'message': 'Pin created successfully!', 'pin_id': pin_id})
    except Exception as e:
        # DB 出错时，清理已经落盘的图片
        if processed_main_path and os.path.exists(processed_main_path):
            os.remove(processed_main_path)
        for p, _ in processed_gallery_paths:
            if os.path.exists(p):
                os.remove(p)
        return jsonify({'error': f'Database error: {e}'}), 500



@app.route('/delete/<int:id>', methods=['POST'])
def delete_pin(id):
    try:
        # Get PIN code from request
        if request.is_json:
            input_pin = request.json.get('pin_code')
        else:
            input_pin = request.form.get('pin_code')
        
        if not input_pin:
            return jsonify(success=False, error="PIN code is required"), 400

        conn = sqlite3.connect('archive.db')
        c = conn.cursor()

        # Verify pin exists and PIN code matches
        c.execute("SELECT pin_code, image_path FROM pins WHERE id=?", (id,))
        pin_data = c.fetchone()
        
        if not pin_data:
            conn.close()
            return jsonify(success=False, error="Pin not found"), 404
            
        if input_pin != pin_data[0]:
            conn.close()
            return jsonify(success=False, error="Incorrect PIN code"), 403

        # Delete main image
        main_image_path = pin_data[1]
        if main_image_path and os.path.exists(main_image_path):
            try:
                os.remove(main_image_path)
            except OSError as e:
                print(f"Error deleting main image: {e}")

        # Delete detailed images
        c.execute("SELECT image_path FROM pin_images WHERE pin_id=?", (id,))
        for img_row in c.fetchall():
            img_path = img_row[0]
            if img_path and os.path.exists(img_path):
                try:
                    os.remove(img_path)
                except OSError as e:
                    print(f"Error deleting detail image: {e}")

        # Delete database records
        c.execute("DELETE FROM pin_images WHERE pin_id=?", (id,))
        c.execute("DELETE FROM pins WHERE id=?", (id,))
        conn.commit()
        conn.close()

        return jsonify(success=True, message="Pin deleted successfully")
        
    except Exception as e:
        return jsonify(success=False, error=f"Error deleting pin: {str(e)}"), 500

@app.route('/modify/<int:id>', methods=['GET', 'POST'])
def modify_pin(id):
    try:
        print(f"=== modify_pin called: method={request.method}, id={id} ===")  # 调试日志
        pin_code = request.args.get('pin') if request.method == 'GET' else request.form.get('pin_code')
        print(f"pin_code={pin_code}")  # 调试日志
        
        if not pin_code:
            return "PIN code is required", 400

        conn = sqlite3.connect('archive.db', timeout=30)
        conn.row_factory = sqlite3.Row
        c = conn.cursor()

        # 取主记录
        c.execute("SELECT * FROM pins WHERE id=?", (id,))
        pin = c.fetchone()
        if not pin:
            conn.close()
            return "Pin not found", 404
            
        if pin['pin_code'] != pin_code:
            conn.close()
            return "Invalid PIN code", 403

        if request.method == 'POST':
            print("=== POST request processing started ===")  # 调试日志
            
            title = request.form.get('title', '').strip()
            author = request.form.get('author', '').strip()
            year = request.form.get('year', '').strip()
            description = request.form.get('description', '').strip()
            print(f"title={title}, author={author}, year={year}")  # 调试日志
            if not title or not author or not description:
                conn.close()
                return jsonify(success=False, error="Title, author and description are required"), 400
            
            # Pre-calculate sanitized title for reuse
            base_title = sanitize_filename(title or pin['title'])
            
            # 1) 更新主图（可选）与主图描述（thumbnail_description）
            thumbnail_description = request.form.get('thumbnail_description', '').strip()
            main_image = request.files.get('main_image')
            new_main_path = None
            if main_image and main_image.filename:
                if not allowed_file(main_image.filename):
                    conn.close()
                    return jsonify(success=False, error="Invalid main image format"), 400

                safe_title = base_title
                ext = main_image.filename.rsplit('.', 1)[1].lower()
                count = 1
                while True:
                    filename = f"{safe_title}_{count}.{ext}"
                    filepath = os.path.join(UPLOAD_FOLDER, filename)
                    if not os.path.exists(filepath):
                        break
                    count += 1

                main_image.stream.seek(0)
                img = Image.open(main_image.stream)
                if img.mode in ('RGBA','LA','P'):
                    img = img.convert('RGB')
                w, h = img.size
                if w < MIN_WIDTH or h < MIN_HEIGHT:
                    img = img.resize((MIN_WIDTH, MIN_HEIGHT), Image.Resampling.LANCZOS)

                main_image.stream.seek(0, os.SEEK_END)
                if main_image.stream.tell() > MAX_SIZE_MB * 1024 * 1024:
                    img.thumbnail((1200,1200), Image.Resampling.LANCZOS)

                q = 90
                while True:
                    img.save(filepath, optimize=True, quality=q)
                    if os.path.getsize(filepath) <= MAX_SIZE_MB*1024*1024 or q <= 30: break
                    q -= 5

                new_main_path = filepath.replace('\\','/')

                # 删旧主图文件
                old_path = pin['image_path']
                if old_path and os.path.exists(old_path):
                    try: os.remove(old_path)
                    except: pass

                # 更新主图路径
                c.execute("UPDATE pins SET image_path=? WHERE id=?", (new_main_path, id))

            # 主表：标题、作者、年份、描述、缩略图描述
            c.execute("UPDATE pins SET title=?, author=?, year=?, description=?, image_description=? WHERE id=?",
                      (title, author, year, description, thumbnail_description, id))

            # 2) 现有画廊：改描述/替图/删除
            # 2.1 删除
            delete_ids = request.form.getlist('delete_image_ids[]') or []
            for sid in delete_ids:
                try:
                    img_id = int(sid)
                    c.execute("SELECT image_path FROM pin_images WHERE id=? AND pin_id=?", (img_id, id))
                    row = c.fetchone()
                    if row and row['image_path'] and os.path.exists(row['image_path']):
                        try: os.remove(row['image_path'])
                        except: pass
                    c.execute("DELETE FROM pin_images WHERE id=? AND pin_id=?", (img_id, id))
                except: pass

            # 2.2 替换文件
            #   表单里用 name="replace_image[<img_id>]"
            for key in request.files.keys():
                if key.startswith('replace_image[') and key.endswith(']'):
                    img_id = int(key[len('replace_image['):-1])
                    f = request.files.get(key)
                    if f and f.filename and allowed_file(f.filename):
                        # 旧路径
                        c.execute("SELECT image_path FROM pin_images WHERE id=? AND pin_id=?", (img_id, id))
                        row = c.fetchone()
                        old_path = row['image_path'] if row else None

                        # 存新文件
                        ext = f.filename.rsplit('.',1)[1].lower()
                        new_name = f"{base_title}_detail_{img_id}.{ext}"
                        new_path = os.path.join(UPLOAD_FOLDER, new_name)
                        di = Image.open(f.stream)
                        
                        # 检查是否为 GIF 动画
                        is_gif = ext == 'gif' and hasattr(di, 'is_animated') and di.is_animated
                        
                        # 如果是 GIF 动画，直接保存
                        if is_gif:
                            f.stream.seek(0)
                            with open(new_path, 'wb') as out_file:
                                out_file.write(f.stream.read())
                        else:
                            if di.mode in ('RGBA','LA','P'): di = di.convert('RGB')
                            dw, dh = di.size
                            if dw < MIN_WIDTH or dh < MIN_HEIGHT:
                                di = di.resize((MIN_WIDTH, MIN_HEIGHT), Image.Resampling.LANCZOS)
                            f.stream.seek(0, os.SEEK_END)
                            if f.stream.tell() > MAX_SIZE_MB*1024*1024:
                                di.thumbnail((1200,1200), Image.Resampling.LANCZOS)
                            di.save(new_path, optimize=True, quality=90)

                        c.execute("UPDATE pin_images SET image_path=? WHERE id=? AND pin_id=?",
                                  (new_path.replace('\\','/'), img_id, id))

                        if old_path and os.path.exists(old_path):
                            try: os.remove(old_path)
                            except: pass

            # 2.3 更新现有图片描述（existing_desc[img_id]）
            for key, val in request.form.items():
                if key.startswith('existing_desc[') and key.endswith(']'):
                    img_id = int(key[len('existing_desc['):-1])
                    c.execute("UPDATE pin_images SET image_description=? WHERE id=? AND pin_id=?",
                              (val.strip(), img_id, id))

            # 3) 新增画廊（details + image_descriptions[]）
            new_files = request.files.getlist('details') if 'details' in request.files else []
            new_descs = request.form.getlist('image_descriptions[]') or []
            for i, f in enumerate(new_files):
                if not (f and f.filename and allowed_file(f.filename)): continue
                ext = f.filename.rsplit('.',1)[1].lower()
                # 取当前最大 order_index
                c.execute("SELECT COALESCE(MAX(order_index), -1) FROM pin_images WHERE pin_id=?", (id,))
                start_idx = (c.fetchone()[0] or -1) + 1
                fname = f"{base_title}_detail_{start_idx}.{ext}"
                fpath = os.path.join(UPLOAD_FOLDER, fname)
                di = Image.open(f.stream)
                
                # 检查是否为 GIF 动画
                is_gif = ext == 'gif' and hasattr(di, 'is_animated') and di.is_animated
                
                # 如果是 GIF 动画，直接保存
                if is_gif:
                    f.stream.seek(0)
                    with open(fpath, 'wb') as out_file:
                        out_file.write(f.stream.read())
                else:
                    if di.mode in ('RGBA','LA','P'): di = di.convert('RGB')
                    if di.size[0] < MIN_WIDTH or di.size[1] < MIN_HEIGHT:
                        di = di.resize((MIN_WIDTH, MIN_HEIGHT), Image.Resampling.LANCZOS)
                    f.stream.seek(0, os.SEEK_END)
                    if f.stream.tell() > MAX_SIZE_MB*1024*1024:
                        di.thumbnail((1200,1200), Image.Resampling.LANCZOS)
                    di.save(fpath, optimize=True, quality=90)
                desc = new_descs[i] if i < len(new_descs) else ''
                c.execute("""INSERT INTO pin_images (pin_id, image_path, image_description, order_index)
                             VALUES (?, ?, ?, ?)""", (id, fpath.replace('\\','/'), desc, start_idx))

            # 4) 可选：更新排序（new_order = JSON 数组，内容为 image_path 或 id 均可）
            if 'new_order' in request.form and request.form['new_order'].strip():
                import json
                try:
                    order_list = json.loads(request.form['new_order'])
                    # 如果传的是路径
                    if order_list and isinstance(order_list[0], str):
                        for idx, p in enumerate(order_list):
                            c.execute("UPDATE pin_images SET order_index=? WHERE pin_id=? AND image_path=?",
                                      (idx, id, p))
                    else:
                        # 如果传的是 id
                        for idx, img_id in enumerate(order_list):
                            c.execute("UPDATE pin_images SET order_index=? WHERE pin_id=? AND id=?",
                                      (idx, id, img_id))
                except Exception as e:
                    print("Order update error:", e)

            # 5) 提交
            conn.commit()
            conn.close()
            # ✅ 确保重定向到详情页
            print(f"Redirecting to detail page for pin {id}")  # 调试日志
            return redirect(url_for('detail', id=id), code=302)

        # GET：读取现有图（带 id 与描述）
        c.execute("SELECT id, image_path, image_description FROM pin_images WHERE pin_id=? ORDER BY order_index ASC", (id,))
        extra_images = [(r['id'], r['image_path'], r['image_description']) for r in c.fetchall()]
        conn.close()
        return render_template('modify.html', pin=pin, extra_images=extra_images, pin_code=pin_code)
        
    except Exception as e:
        print(f"Modify error: {str(e)}")  # 添加日志
        import traceback
        traceback.print_exc()  # 打印完整堆栈
        return f"Error: {str(e)}", 500


# Route to show a specific pin's detail by ID
@app.route('/detail/<int:id>')
def detail(id):
    conn = sqlite3.connect('archive.db')
    c = conn.cursor()
    c.execute("SELECT * FROM pins WHERE id=?", (id,))
    pin = c.fetchone()
    c.execute("SELECT image_path, image_description FROM pin_images WHERE pin_id=? ORDER BY order_index ASC", (id,))
    extra_images = [(r[0], r[1]) for r in c.fetchall()]
    conn.close()
    
    # 获取缩略图描述（pin[13] 是 image_description 字段）
    thumbnail_description = pin[13] if len(pin) > 13 else ''
    
    return render_template('detail.html', pin=pin, extra_images=extra_images, thumbnail_description=thumbnail_description)


# API route to get all pin locations and titles for map rendering
@app.route('/api/pins')
def api_pins():
    try:
        conn = sqlite3.connect('archive.db')
        c = conn.cursor()
        c.execute("SELECT id, title, lat, lng, author, timestamp, project_type FROM pins ORDER BY timestamp DESC")
        rows = c.fetchall()
        conn.close()
        
        pins = []
        for r in rows:
            pins.append({
                "id": r[0],
                "title": r[1],
                "lat": r[2],
                "lng": r[3],
                "author": r[4],
                "timestamp": r[5],
                "project_type": r[6] or 'Other'
            })
        
        return jsonify(pins)
    except Exception as e:
        return jsonify({"error": f"Error fetching pins: {str(e)}"}), 500

# API route to get full detail of a single pin by ID
@app.route('/api/pin/<int:id>')
def api_pin(id):
    try:
        conn = sqlite3.connect('archive.db')
        c = conn.cursor()
        c.execute("SELECT * FROM pins WHERE id=?", (id,))
        r = c.fetchone()
        
        if not r:
            conn.close()
            return jsonify({"error": "Pin not found"}), 404
        
        # Get detailed images
        c.execute("SELECT image_path FROM pin_images WHERE pin_id=? ORDER BY order_index ASC", (id,))
        detail_images = [img[0] for img in c.fetchall()]
        
        conn.close()
        
        return jsonify({
            "id": r[0],                # Pin ID
            "title": r[1],             # Project title
            "description": r[2],       # Full project description
            "author": r[3],            # Author/uploader
            "lat": r[4],               # Latitude
            "lng": r[5],               # Longitude
            "image": r[6],             # File path to image
            "timestamp": r[7],         # Upload time
            "likes": r[8],             # Number of likes
            "detail_images": detail_images  # Additional images
        })
    except Exception as e:
        return jsonify({"error": f"Error fetching pin: {str(e)}"}), 500

# API route to get feedback statistics
@app.route('/api/feedback/stats')
def feedback_stats():
    try:
        conn = sqlite3.connect('archive.db')
        c = conn.cursor()
        
        # Get total feedback count
        c.execute("SELECT COUNT(*) FROM feedback")
        total_feedback = c.fetchone()[0]
        
        # Get average rating
        c.execute("SELECT AVG(rating) FROM feedback")
        avg_rating = c.fetchone()[0] or 0
        
        # Get recent feedback (last 10)
        c.execute("SELECT name, message, rating, timestamp FROM feedback ORDER BY timestamp DESC LIMIT 10")
        recent_feedback = c.fetchall()
        
        conn.close()
        
        return jsonify({
            "total_feedback": total_feedback,
            "average_rating": round(avg_rating, 1),
            "recent_feedback": [
                {
                    "name": f[0],
                    "message": f[1],
                    "rating": f[2],
                    "timestamp": f[3]
                } for f in recent_feedback
            ]
        })
    except Exception as e:
        return jsonify({"error": f"Error fetching feedback stats: {str(e)}"}), 500

# API route to increment the like count for a specific pin
@app.route('/like/<int:id>', methods=['POST'])
def like_pin(id):
    try:
        conn = sqlite3.connect('archive.db')
        c = conn.cursor()
        
        # Check if pin exists
        c.execute("SELECT likes FROM pins WHERE id=?", (id,))
        result = c.fetchone()
        
        if not result:
            conn.close()
            return jsonify({"error": "Pin not found"}), 404
        
        # Update likes
        c.execute("UPDATE pins SET likes = likes + 1 WHERE id=?", (id,))
        conn.commit()
        
        # Get updated likes count
        c.execute("SELECT likes FROM pins WHERE id=?", (id,))
        likes = c.fetchone()[0]
        conn.close()
        
        return jsonify({"likes": likes, "message": "Like added successfully"})
        
    except Exception as e:
        return jsonify({"error": f"Error updating likes: {str(e)}"}), 500

# Error handlers
@app.errorhandler(404)
def not_found(error):
    return jsonify({"error": "Resource not found"}), 404

@app.errorhandler(500)
def internal_error(error):
    return jsonify({"error": "Internal server error"}), 500

@app.errorhandler(400)
def bad_request(error):
    return jsonify({"error": "Bad request"}), 400

# Health check endpoint
@app.get("/health")
def health():
    return {"ok": True}

# Start the Flask development server
if __name__ == '__main__':
    app.run(debug=True, use_reloader=False, host='0.0.0.0', port=5000)
