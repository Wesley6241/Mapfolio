// Global variables
let map = null;
let markers = [];
let customPinIcon = null;

// Project type colors
const projectTypeColors = {
    'Architecture': '#FFB8C3',
    'Urban Planning': '#88D7FF',
    'Urban-Planning': '#88D7FF',
    'Urban Design': '#FFF27E',
    'Urban-Design': '#FFF27E',
    'Landscape Architecture': '#84FF9F',
    'Landscape-Architecture': '#84FF9F',
    'Other': '#E0E0E0'
};

// Function to create SVG pin icon based on project type with comprehensive responsive sizing
function createSVGPinIcon(projectType) {
    const svgPaths = {
        'Architecture': '/static/image/Architecture.svg',
        'Urban Planning': '/static/image/Urban-Planning.svg',
        'Urban-Planning': '/static/image/Urban-Planning.svg',
        'Urban Design': '/static/image/Urban-Design.svg',
        'Urban-Design': '/static/image/Urban-Design.svg',
        'Landscape Architecture': '/static/image/Landscape-Architecture.svg',
        'Landscape-Architecture': '/static/image/Landscape-Architecture.svg',
        'Other': '/static/image/Other.svg'
    };
    
    const svgPath = svgPaths[projectType] || svgPaths['Other'];
    
    // 确保是绝对静态路径并编码URL
    const url = svgPath.startsWith('/static/')
        ? svgPath
        : `/static/image/${svgPath}`;
    
    // 编码URL处理空格、中文等
    const encodedUrl = encodeURI(url);
    
    // 调试信息
    console.debug('Pin icon url =', encodedUrl);
    
    // Get screen dimensions and map container size for intelligent scaling
    const screenWidth = window.innerWidth;
    const screenHeight = window.innerHeight;
    const devicePixelRatio = window.devicePixelRatio || 1;
    
    // Get map container dimensions if available
    const mapContainer = document.getElementById('map');
    const mapWidth = mapContainer ? mapContainer.offsetWidth : screenWidth;
    const mapHeight = mapContainer ? mapContainer.offsetHeight : screenHeight;
    
    // Calculate base scale factor based on map container size
    let scaleFactor = 1;
    
    // Use map container size for more accurate scaling
    const containerSize = Math.min(mapWidth, mapHeight);
    
    if (containerSize <= 300) {
        // Very small containers (mobile portrait)
        scaleFactor = 0.3;
    } else if (containerSize <= 400) {
        // Small containers (mobile landscape)
        scaleFactor = 0.4;
    } else if (containerSize <= 500) {
        // Small tablets
        scaleFactor = 0.5;
    } else if (containerSize <= 600) {
        // Medium tablets and small laptops
        scaleFactor = 0.6;
    } else if (containerSize <= 800) {
        // Large tablets and medium laptops
        scaleFactor = 0.7;
    } else if (containerSize <= 1000) {
        // Large laptops
        scaleFactor = 0.8;
    } else if (containerSize <= 1200) {
        // Desktop monitors
        scaleFactor = 0.9;
    } else {
        // Large desktop monitors
        scaleFactor = 1.0;
    }
    
    // Additional adjustments
    if (devicePixelRatio > 1.5) {
        scaleFactor *= 0.9; // Slightly smaller on high DPI screens
    }
    
    // Ensure minimum size for visibility
    const minSize = 8;
    const maxSize = 40;
    const finalIconWidth = Math.max(minSize, Math.min(maxSize, Math.round(28 * scaleFactor)));
    scaleFactor = finalIconWidth / 28; // Recalculate scale factor based on final size
    
    // Calculate responsive dimensions
    const iconWidth = Math.round(28 * scaleFactor);
    const iconHeight = Math.round(61 * scaleFactor);
    const anchorX = Math.round(iconWidth / 2);
    const anchorY = iconHeight;
    
    // Debug info (remove in production)
    console.log(`Screen: ${screenWidth}x${screenHeight}px, Map: ${mapWidth}x${mapHeight}px, Container: ${containerSize}px, DPR: ${devicePixelRatio}, Scale: ${scaleFactor}, Icon: ${iconWidth}x${iconHeight}, Anchor: [${anchorX}, ${anchorY}]`);
    
    return L.icon({
        iconUrl: encodedUrl,  // ✅ 关键：处理空格、中文等
        iconSize: [iconWidth, iconHeight],
        iconAnchor: [anchorX, anchorY], // Pin point at bottom center
        popupAnchor: [0, -anchorY] // Popup appears above the pin
    });
}

// Load pins from backend
function refreshMapMarkers() {
    markers.forEach(marker => map.removeLayer(marker));
    markers.length = 0;
    
    // Clear global markers array for hit detection
    if (window.__allMarkers) {
        window.__allMarkers.length = 0;
    }

    fetch('/api/pins')
        .then(res => res.json())
        .then(pins => {
            pins.forEach(pin => {
                // Get project type and corresponding SVG icon
                const projectType = pin.project_type || 'Other';
                const color = projectTypeColors[projectType] || projectTypeColors['Other'];
                const pinIcon = createSVGPinIcon(projectType);
                
                const marker = L.marker([pin.lat, pin.lng], {
                    icon: pinIcon,
                    pinId: pin.id  // Store pin ID for reference
                }).addTo(map);
                
                // Store marker ID for hit detection
                marker.__id = pin.id;
                
                // Add to global markers array for hit detection
                if (!window.__allMarkers) {
                    window.__allMarkers = [];
                }
                window.__allMarkers.push(marker);
                marker.bindPopup(`
          <div class="pin-popup">
            <div class="pin-popup__content">
              <div class="pin-popup__close" onclick="closePinPopup()">&times;</div>
              <h3 class="pin-popup__title">${pin.title}</h3>
              <div class="pin-popup__category" style="color: ${color};">${projectType}</div>
              <div class="pin-popup__buttons">
                <button onclick="viewDetail(${pin.id})" class="pin-popup__btn pin-popup__btn--view">View</button>
                <button onclick="requestPinCode(${pin.id}, 'delete')" class="pin-popup__btn pin-popup__btn--delete">Delete</button>
                <button onclick="requestPinCode(${pin.id}, 'modify')" class="pin-popup__btn pin-popup__btn--modify">Modify</button>
              </div>
            </div>
          </div>
        `, {
            className: 'custom-popup',
            closeButton: false
        });

                markers.push(marker);
            });
        });
}

// Context menu functionality
let contextMenu = null;
let contextMenuVisible = false;
let clickPosition = null;

// PIN verification functionality
let pinDialog = null;
let pinDialogVisible = false;
let currentEditPinId = null;
let currentAction = null;

// Initialize context menu and PIN dialog
document.addEventListener('DOMContentLoaded', function() {
    // Initialize map
    customPinIcon = L.icon({
        iconUrl: '/static/image/pin.png',
        iconSize: [30, 30],
        iconAnchor: [15, 30],
        popupAnchor: [0, -30]
    });

    // Initialize the map with OpenStreetMap
    map = L.map('map', {
        center: [42.374, -71.117],
        zoom: 14,
        zoomControl: false, // Hide default zoom controls
        attributionControl: false // Hide default attribution
    });

    // Load Stadia Maps tiles (Alidade Smooth)
    L.tileLayer('https://tiles.stadiamaps.com/tiles/alidade_smooth/{z}/{x}/{y}{r}.png', {
        maxZoom: 20,
        attribution: '&copy; <a href="https://stadiamaps.com/">Stadia Maps</a>, ' +
                     '&copy; <a href="https://openmaptiles.org/">OpenMapTiles</a>, ' +
                     '&copy; <a href="https://openstreetmap.org/copyright">OpenStreetMap</a>'
    }).addTo(map);

    // Add custom attribution
    const attribution = L.control.attribution({
        position: 'bottomleft'
    });
    attribution.addTo(map);
    attribution.setPrefix('Powered by OpenStreetMap');

    // ========= Remember/Restore Map View in this tab =========
    const VIEW_KEY = 'mapfolio:view';
    const DEFAULT_VIEW = { center: [42.3736, -71.1190], zoom: 14 };

    function isValidLatLng([lat, lng]) {
        return Number.isFinite(lat) && Number.isFinite(lng) &&
               lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
    }

    function restoreView() {
        try {
            const raw = sessionStorage.getItem(VIEW_KEY);
            if (!raw) return false;
            const v = JSON.parse(raw);
            if (!v || !Array.isArray(v.center) || !isValidLatLng(v.center) || !Number.isFinite(v.zoom)) {
                return false;
            }
            map.setView(v.center, v.zoom, { animate: false });
            return true;
        } catch (e) {
            console.warn('Restore map view failed:', e);
            return false;
        }
    }

    function saveView() {
        try {
            const c = map.getCenter();
            const v = { center: [+c.lat.toFixed(6), +c.lng.toFixed(6)], zoom: map.getZoom() };
            sessionStorage.setItem(VIEW_KEY, JSON.stringify(v));
        } catch (e) {
            // Ignore storage exceptions (private mode/quota full, etc.)
        }
    }

    // 1) Initialize by attempting to restore; otherwise use default view
    if (!restoreView()) {
        map.setView(DEFAULT_VIEW.center, DEFAULT_VIEW.zoom);
    }

    // 2) Save view during browsing (with simple debounce)
    let saveTimer = null;
    map.on('moveend', () => {
        clearTimeout(saveTimer);
        saveTimer = setTimeout(saveView, 120);
    });

// Load existing pins on page load
refreshMapMarkers();

// Re-render pins when window is resized to adjust scaling
let resizeTimeout;
let lastScreenSize = { width: window.innerWidth, height: window.innerHeight };

function handleResize() {
    const currentScreenSize = { width: window.innerWidth, height: window.innerHeight };
    
    // Only re-render if screen size actually changed significantly
    const widthDiff = Math.abs(currentScreenSize.width - lastScreenSize.width);
    const heightDiff = Math.abs(currentScreenSize.height - lastScreenSize.height);
    
    if (widthDiff > 50 || heightDiff > 50) { // Only if change is significant
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(function() {
            console.log('Screen size changed, re-rendering pins...');
            refreshMapMarkers();
            lastScreenSize = currentScreenSize;
        }, 300); // Slightly longer debounce for better performance
    }
}

// Listen for resize events
window.addEventListener('resize', handleResize);

// Also listen for orientation change on mobile devices
window.addEventListener('orientationchange', function() {
    setTimeout(function() {
        console.log('Orientation changed, re-rendering pins...');
        refreshMapMarkers();
        lastScreenSize = { width: window.innerWidth, height: window.innerHeight };
    }, 500); // Wait for orientation change to complete
});

    // Initialize UI elements
    contextMenu = document.getElementById('contextMenu');
    pinDialog = document.getElementById('pinVerificationDialog');
    
    // Hide context menu when clicking elsewhere
    document.addEventListener('click', function(e) {
        if (contextMenuVisible && !contextMenu.contains(e.target)) {
            hideContextMenu();
        }
    });
    
    // Close PIN dialog on Escape key
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            const pinDialog = document.getElementById('pinVerificationDialog');
            if (pinDialog && pinDialog.style.display === 'flex') {
                hidePinDialog();
            }
        }
    });
    
    // Handle context menu option clicks
    document.getElementById('addPinOption').addEventListener('click', function() {
        if (clickPosition) {
            openUploadModal(clickPosition);
            hideContextMenu();
        }
    });
    
    // Handle PIN dialog option click
    document.getElementById('pinInputOption').addEventListener('click', function() {
        showPinInput();
    });
    
    // Initialize project type dropdown
    initializeProjectTypeDropdown();
    
    // Initialize image previews
    initializeImagePreviews();

    // Upload modal logic
    const uploadModal = new bootstrap.Modal(document.getElementById('uploadModal'), {
        backdrop: 'static',
        keyboard: false
    });
    const successModal = new bootstrap.Modal(document.getElementById('successModal'));

    // Map click handlers
    map.on('click', function(e) {
        // Left click - normal map navigation (do nothing)
        // This allows normal map interaction
    });

    // Right click - show context menu (only for adding new pins)
    map.on('contextmenu', function(e) {
        e.originalEvent.preventDefault(); // Prevent browser context menu
        
        const containerPoint = map.latLngToContainerPoint(e.latlng);
        showContextMenu(containerPoint);
    });

    // Function to open upload modal with coordinates
    function openUploadModal(position) {
        const latLng = map.containerPointToLatLng(position);
        const lat = latLng.lat.toFixed(6);
        const lng = latLng.lng.toFixed(6);
        document.getElementById('lat').value = lat;
        document.getElementById('lng').value = lng;
        uploadModal.show();
    }

    // Submit form via AJAX
    document.getElementById('submitUpload').addEventListener('click', function() {
        const formData = new FormData(document.getElementById('uploadForm'));
        
        // 用我们累积的列表覆盖
        formData.delete('details');
        formData.delete('image_descriptions[]');
        formData.delete('image'); // 删除原有的缩略图
        formData.delete('thumbnail_description'); // 删除原有的缩略图描述

        // 添加缩略图（如果有）
        if (window.thumbnailImage) {
            formData.append('image', window.thumbnailImage.file);
            formData.append('thumbnail_description', window.thumbnailImage.desc || '');
        }

        // 添加画廊图片
        (window.uploadedImages || []).forEach(img => {
            formData.append('details', img.file);
            formData.append('image_descriptions[]', img.desc || '');
        });

        fetch('/upload', {
                method: 'POST',
                body: formData
            })
            .then(response => {
                if (!response.ok) {
                    return response.json().then(err => {
                        throw err;
                    });
                }
                return response.json();
            })
            .then(data => {
                // 重置表单和图片数组
                document.getElementById('uploadForm').reset();
                window.uploadedImages = [];
                window.thumbnailImage = null;
                updateGalleryPreview();
                updateThumbnailPreview();
                updateImageCount();
                checkScrollHint();
                
                uploadModal.hide();
                successModal.show();
                refreshMapMarkers();
            })
            .catch(error => {
                alert('Error: ' + (error.error || 'Submission failed'));
            });
    });

    // Exit button functionality
    document.getElementById('exitUpload').addEventListener('click', function() {
        uploadModal.hide();
        document.getElementById('uploadForm').reset();
        
        // 重置图片数组和预览
        window.uploadedImages = [];
        window.thumbnailImage = null;
        updateGalleryPreview();
        updateThumbnailPreview();
        updateImageCount();
        checkScrollHint();
    });
});

function showContextMenu(position) {
    if (!contextMenu) return;
    
    clickPosition = position;
    contextMenuVisible = true;
    
    // Position the context menu
    contextMenu.style.left = position.x + 'px';
    contextMenu.style.top = position.y + 'px';
    contextMenu.style.display = 'flex';
}

function hideContextMenu() {
    if (!contextMenu) return;
    
    contextMenuVisible = false;
    contextMenu.style.display = 'none';
    clickPosition = null;
}

// PIN Dialog Functions
function showPinDialog(position) {
    if (!pinDialog) return;
    
    pinDialogVisible = true;
    
    // Position the PIN dialog
    pinDialog.style.left = position.x + 'px';
    pinDialog.style.top = position.y + 'px';
    pinDialog.style.display = 'flex';
    
    // Reset to initial state
    document.getElementById('pinInputOption').style.display = 'flex';
    document.querySelector('.pin-dialog__input').style.display = 'none';
}

function hidePinDialog() {
    const dialog = document.getElementById('pinVerificationDialog');
    if (!dialog) return;
    
    pinDialogVisible = false;
    dialog.classList.remove('centered');
    dialog.style.display = 'none';
    currentEditPinId = null;
    currentAction = null;
    
    // Clear PIN input
    const pinInput = document.getElementById('pinInput');
    if (pinInput) {
        pinInput.value = '';
    }
    
    console.log('PIN dialog hidden');
}

function showPinInput() {
    console.log('showPinInput called');
    
    const pinInputOption = document.getElementById('pinInputOption');
    const pinInput = document.querySelector('.pin-dialog__input');
    const pinField = document.getElementById('pinInput');
    
    console.log('pinInputOption:', pinInputOption);
    console.log('pinInput:', pinInput);
    console.log('pinField:', pinField);
    
    if (pinInputOption) {
        pinInputOption.style.display = 'none';
    }
    if (pinInput) {
        pinInput.style.display = 'block';
    }
    if (pinField) {
        pinField.focus();
    }
}

// Form Functions
function initializeProjectTypeDropdown() {
    const projectTypeInput = document.getElementById('projectType');
    const dropdown = document.getElementById('projectTypeDropdown');
    const options = dropdown.querySelectorAll('.dropdown-option');
    
    projectTypeInput.addEventListener('click', function() {
        dropdown.classList.toggle('show');
    });
    
    options.forEach(option => {
        option.addEventListener('click', function() {
            projectTypeInput.value = this.dataset.value;
            dropdown.classList.remove('show');
        });
    });
    
    // Close dropdown when clicking outside
    document.addEventListener('click', function(e) {
        if (!projectTypeInput.contains(e.target) && !dropdown.contains(e.target)) {
            dropdown.classList.remove('show');
        }
    });
}

function initializeImagePreviews() {
    // 全局变量存储已上传的图片
    window.uploadedImages = [];
    // 全局变量存储缩略图信息
    window.thumbnailImage = null;
    
    const thumbnailInput = document.getElementById('image');
    const galleryInput = document.getElementById('details');
    const thumbnailPreview = document.getElementById('thumbnailPreview');
    const galleryPreview = document.getElementById('galleryPreview');
    const scrollHint = document.getElementById('scrollHint');
    const imageCount = document.getElementById('imageCount');
    const imageCountText = document.getElementById('imageCountText');
    
    // ✅ 缩略图也询问名称
    thumbnailInput.addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (!file) return;
        
        (async () => {
            const dataUrl = await new Promise(res => {
                const r = new FileReader();
                r.onload = ev => res(ev.target.result);
                r.readAsDataURL(file);
            });

            // 询问缩略图名称
            let desc = prompt('为缩略图输入名称（可留空）：', file.name.replace(/\.\w+$/, '')) || '';
            
            // 存储缩略图信息
            window.thumbnailImage = {
                file, dataUrl, desc
            };
            
            // 更新预览显示
            updateThumbnailPreview();
        })();
    });
    
    // ✅ 每张图片都询问名称，并缓存 {file, dataUrl, desc}
    galleryInput.addEventListener('change', function(e) {
        const files = Array.from(e.target.files || []);
        if (files.length === 0) return;

        (async () => {
            for (const file of files) {
                const dataUrl = await new Promise(res => {
                    const r = new FileReader();
                    r.onload = ev => res(ev.target.result);
                    r.readAsDataURL(file);
                });

                // 询问名称（可换成自定义小弹窗）
                let desc = prompt('为这张图片输入名称（可留空）：', file.name.replace(/\.\w+$/, '')) || '';
                // 存起来
                window.uploadedImages.push({
                    id: Date.now() + Math.random(),
                    file, dataUrl, desc
                });
                updateGalleryPreview();
                updateImageCount();
                checkScrollHint();
            }
            // 允许再次选择相同文件
            e.target.value = '';
        })();
    });
    
    // 更新缩略图预览显示
    function updateThumbnailPreview() {
        if (!window.thumbnailImage) {
            thumbnailPreview.innerHTML = '<div class="image-placeholder">No thumbnail selected</div>';
            return;
        }
        thumbnailPreview.innerHTML = `
            <div style="display:flex;flex-direction:column;align-items:center;gap:4px">
                <img src="${window.thumbnailImage.dataUrl}" class="thumbnail-img" title="点击删除"
                     onclick="removeThumbnailImage()">
                <div style="font:12px/1.2 'Roboto', sans-serif; max-width:200px; text-align:center;"
                     ondblclick="renameThumbnailImage()"
                     title="双击可改名">${window.thumbnailImage.desc ? window.thumbnailImage.desc : '(未命名)'}</div>
            </div>
        `;
    }
    
    // 预览里显示名称 + 提供"改名/删除"
    function updateGalleryPreview() {
        if (window.uploadedImages.length === 0) {
            galleryPreview.innerHTML = '<div class="image-placeholder">No images selected</div>';
            return;
        }
        galleryPreview.innerHTML = window.uploadedImages.map(img => `
            <div style="display:flex;flex-direction:column;align-items:center;gap:4px">
                <img src="${img.dataUrl}" class="gallery-image" title="点击删除"
                     onclick="removeGalleryImage('${img.id}')">
                <div style="font:12px/1.2 'Roboto', sans-serif; max-width:90px; text-align:center;"
                     ondblclick="renameGalleryImage('${img.id}')"
                     title="双击可改名">${img.desc ? img.desc : '(未命名)'}</div>
            </div>
        `).join('');
    }
    
    // 更新图片计数
    function updateImageCount() {
        const n = window.uploadedImages.length;
        if (n > 0) {
            imageCount.style.display = 'block';
            imageCountText.textContent = `${n} image${n>1?'s':''} uploaded`;
        } else {
            imageCount.style.display = 'none';
        }
    }
    
    // 检查是否需要显示滚动提示
    function checkScrollHint() {
        scrollHint.style.display = window.uploadedImages.length > 2 ? 'block' : 'none';
    }
    
    // 全局可用：删除/改名
    window.removeGalleryImage = function(id) {
        if (!confirm('Remove this image?')) return;
        window.uploadedImages = window.uploadedImages.filter(x => x.id !== id);
        updateGalleryPreview(); updateImageCount(); checkScrollHint();
    };
    window.renameGalleryImage = function(id) {
        const it = window.uploadedImages.find(x => x.id === id);
        if (!it) return;
        const nv = prompt('修改图片名称：', it.desc || '') ?? it.desc;
        it.desc = nv.trim();
        updateGalleryPreview();
    };
    
    // 缩略图删除/改名
    window.removeThumbnailImage = function() {
        if (!confirm('Remove thumbnail?')) return;
        window.thumbnailImage = null;
        updateThumbnailPreview();
    };
    window.renameThumbnailImage = function() {
        if (!window.thumbnailImage) return;
        const nv = prompt('修改缩略图名称：', window.thumbnailImage.desc || '') ?? window.thumbnailImage.desc;
        window.thumbnailImage.desc = nv.trim();
        updateThumbnailPreview();
    };
}

function viewDetail(id) {
    window.location.href = `/detail/${id}`;
}

function deletePin(id) {
    if (!confirm('Are you sure you want to delete this pin?')) return;

    fetch(`/delete/${id}`, {
            method: 'POST'
        })
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                alert('Pin deleted');
                refreshMapMarkers();
            } else {
                alert('Deletion failed');
            }
        })
        .catch(err => {
            alert('Error deleting pin');
            console.error(err);
        });
}

// New function to request PIN code for delete/modify operations
function requestPinCode(pinId, action) {
  try {
      console.log('requestPinCode called with pinId:', pinId, 'action:', action);
      currentEditPinId = pinId;
      currentAction = action || 'modify';

      // 先关掉 pin 的 Leaflet 弹窗
      if (window.map && map.closePopup) map.closePopup();

      // 拿对话框（若有多个同名，统一提到 body 末尾）
      let dlg = document.getElementById('pinVerificationDialog');
      if (!dlg) {
        alert('Missing #pinVerificationDialog in DOM.');
        return;
      }
      if (!document.body.contains(dlg)) {
        document.body.appendChild(dlg);
      }

      // 若页面上有重复 id，确保只保留第一个，其他移除
      const dups = document.querySelectorAll('#pinVerificationDialog');
      if (dups.length > 1) {
        for (let i = 1; i < dups.length; i++) dups[i].parentNode.removeChild(dups[i]);
      }

      // 直接强制样式（避开任何 CSS 覆盖）
      dlg.classList.add('centered');
      dlg.style.removeProperty('display');
      dlg.style.display = 'flex';
      dlg.style.position = 'fixed';
      dlg.style.inset = '0';
      dlg.style.zIndex = '99999';
      dlg.style.pointerEvents = 'auto';

      // 初始态：先显示"输入 PIN"提示，再允许切换输入框
      const opt = document.getElementById('pinInputOption');
      const inputBox = dlg.querySelector('.pin-dialog__input');
      if (opt && inputBox) {
        opt.style.display = 'flex';
        inputBox.style.display = 'none';
        opt.onclick = showPinInput;
      }

      // 打点：确认真的被改了
      console.log('pinDialog after show:', dlg.outerHTML);

  } catch (e) {
      console.error('requestPinCode error:', e);
      alert('Unexpected error: ' + e.message);
  }
}

// Function to close pin popup
function closePinPopup() {
    map.closePopup();
}

// Updated verifyPin function to handle both delete and modify actions
async function verifyPin() {
    try {
        const pinInput = document.getElementById('pinInput');
        const pin = pinInput ? pinInput.value.trim() : '';
        const pinId = currentEditPinId;
        const action = currentAction || 'modify';

        if (!pin || !pinId) {
            alert('Missing pin or action.');
            return;
        }

        const res = await fetch(`/verify-pin/${encodeURIComponent(pinId)}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ pin_code: pin })
        });

        if (!res.ok) {
            alert('Network error.');
            return;
        }

        const data = await res.json();
        if (!data || !data.success) {
            // Clear PIN input on error
            if (pinInput) {
                pinInput.value = '';
                pinInput.focus();
            }
            alert(data?.message || 'PIN incorrect.');
            return;
        }

        // 成功：根据动作跳转
        if (action === 'delete') {
            // 如果你的删除是前端继续确认 -> 再发 /delete-pin/:id
            const ok = confirm('Are you sure to delete this pin?');
            if (!ok) return;

            const del = await fetch(`/delete/${encodeURIComponent(pinId)}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ pin_code: pin })
            });
            const d = await del.json();
            if (d?.success) {
                alert('Deleted.');
                location.reload();
            } else {
                alert(d?.message || 'Delete failed.');
            }
            return;
        }

        // 默认 modify：带 pin 参数进入修改页
        window.location.href = `/modify/${encodeURIComponent(pinId)}?pin=${encodeURIComponent(pin)}`;
    } catch (err) {
        console.error(err);
        alert('Unexpected error.');
    }
}

// Legacy function for backward compatibility
function modifyPin(id) {
    requestPinCode(id, 'modify');
}
