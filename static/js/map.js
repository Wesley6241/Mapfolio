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

// 计算 pins 最聚集区域的视图，使得该区域内能看到几乎所有的 pins
function calculateWeightedView(pins) {
    if (!pins || pins.length === 0) {
        return null;
    }
    
    // 如果只有一个 pin，直接返回它的位置
    if (pins.length === 1) {
        return {
            center: [pins[0].lat, pins[0].lng],
            zoom: 15,
            bounds: [[pins[0].lat, pins[0].lng], [pins[0].lat, pins[0].lng]]
        };
    }
    
    // 方法：计算每个 pin 周围的密度，找到密度最高的区域
    // 然后找到包含该区域大部分 pins 的视图
    
    // 计算所有 pins 的边界
    let minLat = pins[0].lat;
    let maxLat = pins[0].lat;
    let minLng = pins[0].lng;
    let maxLng = pins[0].lng;
    
    pins.forEach(pin => {
        minLat = Math.min(minLat, pin.lat);
        maxLat = Math.max(maxLat, pin.lat);
        minLng = Math.min(minLng, pin.lng);
        maxLng = Math.max(maxLng, pin.lng);
    });
    
    const latSpan = maxLat - minLat;
    const lngSpan = maxLng - minLng;
    
    // 计算每个 pin 周围的密度（附近有多少其他 pins）
    const pinDensities = pins.map((pin, index) => {
        // 计算该 pin 周围一定范围内的其他 pins 数量
        // 使用一个合理的搜索半径（根据总分布范围调整）
        const searchRadius = Math.max(latSpan, lngSpan) * 0.15; // 搜索半径约为总跨度的15%
        let nearbyCount = 0;
        
        pins.forEach((otherPin, otherIndex) => {
            if (index !== otherIndex) {
                const latDiff = Math.abs(pin.lat - otherPin.lat);
                const lngDiff = Math.abs(pin.lng - otherPin.lng);
                // 考虑经度在不同纬度下的实际距离
                const latFactor = Math.cos(pin.lat * Math.PI / 180);
                const adjustedLngDiff = lngDiff * latFactor;
                
                // 使用欧几里得距离
                const distance = Math.sqrt(latDiff * latDiff + adjustedLngDiff * adjustedLngDiff);
                if (distance <= searchRadius) {
                    nearbyCount++;
                }
            }
        });
        
        return {
            pin: pin,
            density: nearbyCount,
            index: index
        };
    });
    
    // 找到密度最高的 pin（最聚集区域的中心）
    pinDensities.sort((a, b) => b.density - a.density);
    const densestPin = pinDensities[0].pin;
    
    // 找到密度最高的区域内的所有 pins
    // 使用一个合理的半径来包含该区域的大部分 pins
    const clusterRadius = Math.max(latSpan, lngSpan) * 0.2; // 聚类半径约为总跨度的20%
    const latFactor = Math.cos(densestPin.lat * Math.PI / 180);
    
    const clusterPins = pins.filter(pin => {
        const latDiff = Math.abs(pin.lat - densestPin.lat);
        const lngDiff = Math.abs(pin.lng - densestPin.lng);
        const adjustedLngDiff = lngDiff * latFactor;
        const distance = Math.sqrt(latDiff * latDiff + adjustedLngDiff * adjustedLngDiff);
        return distance <= clusterRadius;
    });
    
    // 计算聚类区域内 pins 的边界
    if (clusterPins.length > 0) {
        let clusterMinLat = clusterPins[0].lat;
        let clusterMaxLat = clusterPins[0].lat;
        let clusterMinLng = clusterPins[0].lng;
        let clusterMaxLng = clusterPins[0].lng;
        
        clusterPins.forEach(pin => {
            clusterMinLat = Math.min(clusterMinLat, pin.lat);
            clusterMaxLat = Math.max(clusterMaxLat, pin.lat);
            clusterMinLng = Math.min(clusterMinLng, pin.lng);
            clusterMaxLng = Math.max(clusterMaxLng, pin.lng);
        });
        
        // 计算聚类中心
        const clusterCenterLat = (clusterMinLat + clusterMaxLat) / 2;
        const clusterCenterLng = (clusterMinLng + clusterMaxLng) / 2;
        
        // 计算边界框的跨度
        const clusterLatSpan = clusterMaxLat - clusterMinLat;
        const clusterLngSpan = clusterMaxLng - clusterMinLng;
        const clusterMaxSpan = Math.max(clusterLatSpan, clusterLngSpan);
        
        // 根据跨度计算合适的缩放级别
        let zoom = 14;
        if (clusterMaxSpan > 0.1) zoom = 9;
        else if (clusterMaxSpan > 0.05) zoom = 10;
        else if (clusterMaxSpan > 0.02) zoom = 11;
        else if (clusterMaxSpan > 0.01) zoom = 12;
        else if (clusterMaxSpan > 0.005) zoom = 13;
        else if (clusterMaxSpan > 0.002) zoom = 14;
        else if (clusterMaxSpan > 0.001) zoom = 15;
        else zoom = 16;
        
        console.log(`Found densest cluster: ${clusterPins.length} pins out of ${pins.length} (${(clusterPins.length/pins.length*100).toFixed(1)}%)`);
        
        return {
            center: [clusterCenterLat, clusterCenterLng],
            zoom: zoom,
            bounds: [[clusterMinLat, clusterMinLng], [clusterMaxLat, clusterMaxLng]]
        };
    }
    
    // 如果聚类失败，返回所有 pins 的边界
    return {
        center: [(minLat + maxLat) / 2, (minLng + maxLng) / 2],
        zoom: 12,
        bounds: [[minLat, minLng], [maxLat, maxLng]]
    };
}

// Load pins from backend
function refreshMapMarkers(shouldFitBounds = false) {
    markers.forEach(marker => map.removeLayer(marker));
    markers.length = 0;
    
    // Clear global markers array for hit detection
    if (window.__allMarkers) {
        window.__allMarkers.length = 0;
    }

    fetch('/api/pins')
        .then(res => res.json())
        .then(pins => {
            // 计算加权视图
            const weightedView = calculateWeightedView(pins);
            
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
            
            // 如果应该适应边界且计算出了视图，则调整地图视图
            if (shouldFitBounds && weightedView && pins.length > 0) {
                // 使用 fitBounds 自动适应最密集区域的 pins，添加一些边距
                const bounds = L.latLngBounds(weightedView.bounds);
                map.fitBounds(bounds, {
                    padding: [100, 100], // 添加 100px 的边距，确保 pins 不会太靠近边缘
                    maxZoom: 16, // 限制最大缩放级别
                    animate: false // 首次加载时不使用动画
                });
                
                console.log('Map view adjusted to show densest pin cluster:', {
                    clusterCenter: weightedView.center,
                    calculatedZoom: weightedView.zoom,
                    actualZoom: map.getZoom(),
                    bounds: weightedView.bounds,
                    totalPinCount: pins.length
                });
            } else if (pins.length === 0) {
                // 如果没有 pins，使用默认视图
                console.log('No pins found, using default view');
            }
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

    // 1) Initialize by attempting to restore; otherwise calculate weighted view from pins
    const hasSavedView = restoreView();
    
    // 2) Save view during browsing (with simple debounce)
    let saveTimer = null;
    map.on('moveend', () => {
        clearTimeout(saveTimer);
        saveTimer = setTimeout(saveView, 120);
    });

    // 3) Load existing pins on page load
    // 如果没有保存的视图，则根据 pins 位置计算加权视图
    refreshMapMarkers(!hasSavedView);

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
            // 关键：在resize时强制Leaflet地图重新计算尺寸
            if (map) {
                map.invalidateSize();
            }
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
        // 关键：在方向改变时强制Leaflet地图重新计算尺寸
        if (map) {
            map.invalidateSize();
        }
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
        // 验证必填字段
        const title = document.getElementById('title').value.trim();
        const author = document.getElementById('author').value.trim();
        const description = document.getElementById('description').value.trim();
        const pinCode = document.getElementById('pin_code').value.trim();
        
        if (!title || !author || !description || !pinCode) {
            alert('Please fill in all required fields (Title, Full Credit, Description, PIN Code)');
            return;
        }
        
        if (!window.thumbnailImage || !window.thumbnailImage.file) {
            alert('Please upload a thumbnail image');
            return;
        }
        
        const formData = new FormData(document.getElementById('uploadForm'));
        
        // 用我们累积的列表覆盖
        formData.delete('details');
        formData.delete('image_descriptions[]');
        formData.delete('image'); // 删除原有的缩略图
        formData.delete('thumbnail_description'); // 删除原有的缩略图描述

        // 添加缩略图（如果有）
        if (window.thumbnailImage && window.thumbnailImage.file) {
            const thumbFile = window.thumbnailImage.file;
            if (thumbFile instanceof File) {
                formData.append('image', thumbFile);
                formData.append('thumbnail_description', window.thumbnailImage.desc || '');
                console.log('Added thumbnail:', thumbFile.name, `(${(thumbFile.size / 1024).toFixed(2)} KB)`);
            } else {
                console.error('Thumbnail file is not a valid File object:', thumbFile);
                alert('Error: Thumbnail file is invalid. Please re-select the image.');
                return;
            }
        }

        // 添加画廊图片
        const galleryImages = window.uploadedImages || [];
        console.log(`Adding ${galleryImages.length} gallery images`);
        let validGalleryCount = 0;
        galleryImages.forEach((img, index) => {
            if (img && img.file && img.file instanceof File) {
                formData.append('details', img.file);
                formData.append('image_descriptions[]', img.desc || '');
                validGalleryCount++;
                console.log(`Added gallery image ${validGalleryCount}:`, img.file.name, `(${(img.file.size / 1024).toFixed(2)} KB)`);
            } else {
                console.warn(`Skipping invalid gallery image at index ${index}:`, img);
            }
        });
        
        if (galleryImages.length > 0 && validGalleryCount === 0) {
            alert('Error: Gallery images are invalid. Please re-select the images.');
            return;
        }
        
        console.log('Submitting form with:', {
            title,
            author,
            description,
            pinCode,
            thumbnail: window.thumbnailImage?.file?.name,
            galleryCount: galleryImages.length
        });

        fetch('/upload', {
                method: 'POST',
                body: formData
            })
            .then(async response => {
                // 尝试解析响应，无论状态码如何
                const contentType = response.headers.get('content-type');
                let errorData = null;
                
                if (contentType && contentType.includes('application/json')) {
                    try {
                        errorData = await response.json();
                    } catch (e) {
                        console.error('Failed to parse error response as JSON:', e);
                    }
                }
                
                if (!response.ok) {
                    // 如果有解析的JSON错误，抛出它
                    if (errorData) {
                        throw errorData;
                    }
                    // 否则抛出包含状态码的错误
                    throw {
                        error: `Server error (${response.status}): ${response.statusText || 'Unknown error'}`
                    };
                }
                
                // 成功响应，返回解析的JSON
                return errorData || response.json();
            })
            .then(data => {
                // 检查返回的数据是否表示成功
                if (data.error) {
                    throw data;
                }
                
                // 重置表单和图片数组
                document.getElementById('uploadForm').reset();
                window.uploadedImages = [];
                window.thumbnailImage = null;
                window.updateGalleryPreview();
                window.updateThumbnailPreview();
                window.updateImageCount();
                window.checkScrollHint();
                
                uploadModal.hide();
                successModal.show();
                refreshMapMarkers();
            })
            .catch(error => {
                console.error('Upload error:', error);
                const errorMessage = error?.error || error?.message || 'Submission failed. Please check your connection and try again.';
                alert('Error: ' + errorMessage);
            });
    });

    // Exit button functionality
    document.getElementById('exitUpload').addEventListener('click', function() {
        uploadModal.hide();
        document.getElementById('uploadForm').reset();
        
        // 重置图片数组和预览
        window.uploadedImages = [];
        window.thumbnailImage = null;
        window.updateGalleryPreview();
        window.updateThumbnailPreview();
        window.updateImageCount();
        window.checkScrollHint();
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

// 全局预览更新函数 - 在脚本加载时定义，确保始终可用
window.updateThumbnailPreview = function() {
    const thumbnailPreview = document.getElementById('thumbnailPreview');
    if (!thumbnailPreview) return;
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
};

window.updateGalleryPreview = function() {
    const galleryPreview = document.getElementById('galleryPreview');
    if (!galleryPreview) return;
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
};

window.updateImageCount = function() {
    const imageCount = document.getElementById('imageCount');
    const imageCountText = document.getElementById('imageCountText');
    if (!imageCount || !imageCountText) return;
    const n = window.uploadedImages.length;
    if (n > 0) {
        imageCount.style.display = 'block';
        imageCountText.textContent = `${n} image${n>1?'s':''} uploaded`;
    } else {
        imageCount.style.display = 'none';
    }
};

window.checkScrollHint = function() {
    const scrollHint = document.getElementById('scrollHint');
    if (!scrollHint) return;
    scrollHint.style.display = window.uploadedImages.length > 2 ? 'block' : 'none';
};

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
            window.updateThumbnailPreview();
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
                window.updateGalleryPreview();
                window.updateImageCount();
                window.checkScrollHint();
            }
            // 允许再次选择相同文件
            e.target.value = '';
        })();
    });
    
    
    // 全局可用：删除/改名
    window.removeGalleryImage = function(id) {
        if (!confirm('Remove this image?')) return;
        window.uploadedImages = window.uploadedImages.filter(x => x.id !== id);
        window.updateGalleryPreview(); 
        window.updateImageCount(); 
        window.checkScrollHint();
    };
    window.renameGalleryImage = function(id) {
        const it = window.uploadedImages.find(x => x.id === id);
        if (!it) return;
        const nv = prompt('修改图片名称：', it.desc || '') ?? it.desc;
        it.desc = nv.trim();
        window.updateGalleryPreview();
    };
    
    // 缩略图删除/改名
    window.removeThumbnailImage = function() {
        if (!confirm('Remove thumbnail?')) return;
        window.thumbnailImage = null;
        window.updateThumbnailPreview();
    };
    window.renameThumbnailImage = function() {
        if (!window.thumbnailImage) return;
        const nv = prompt('修改缩略图名称：', window.thumbnailImage.desc || '') ?? window.thumbnailImage.desc;
        window.thumbnailImage.desc = nv.trim();
        window.updateThumbnailPreview();
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
