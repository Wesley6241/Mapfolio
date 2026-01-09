// JavaScript to handle project editing logic

function submitEdits(pinId) {
    const formData = new FormData();

    // Collect text fields
    formData.append("title", document.getElementById("mod_title").value);
    formData.append("author", document.getElementById("mod_author").value);
    formData.append("description", document.getElementById("mod_description").value);
    formData.append("lat", document.getElementById("mod_lat").value);
    formData.append("lng", document.getElementById("mod_lng").value);
    formData.append("pin_code", document.getElementById("mod_pin").value);

    // Main image replacement
    const mainImgFile = document.getElementById("main_img_file").files[0];
    if (mainImgFile) {
        formData.append("main_image", mainImgFile);
    }

    // Add new detail images
    const detailImgs = document.getElementById("detail_imgs").files;
    for (let i = 0; i < detailImgs.length; i++) {
        formData.append("details", detailImgs[i]);
    }

    // Replacements for existing detail images
    const replacementInputs = document.querySelectorAll("input[name='replace_images']");
    replacementInputs.forEach(input => {
        if (input.files.length > 0) {
            formData.append("replace_old_path", input.dataset.original);
            formData.append("replace_file", input.files[0]);
        }
    });

    // Append new detailed image order
    const imageOrder = [];
    document.querySelectorAll('#detail-sortable .sortable-img').forEach(div => {
        imageOrder.push(div.dataset.img);
    });
    formData.append('new_order', JSON.stringify(imageOrder));

    fetch(`/modify/${pinId}`, {
        method: "POST",
        body: formData
    })
    .then(async (res) => {
        // Handle redirect responses
        if (res.redirected) {
            window.location.href = res.url;
            return;
        }

        const contentType = (res.headers.get('content-type') || '').toLowerCase();

        if (contentType.includes('application/json')) {
            const data = await res.json();
            if (data.success) {
                window.location.href = data.detail_url || `/detail/${pinId}`;
            } else {
                alert("Error: " + (data.error || "Modification failed."));
            }
        } else {
            // Not JSON (likely HTML from 302 redirect), go to detail page
            window.location.href = `/detail/${pinId}`;
        }
    })
    .catch(error => {
        console.error(error);
        // Fallback: likely succeeded but got caught by parsing issue, check result
        window.location.href = `/detail/${pinId}`;
    });
}

function deleteDetailImage(imagePath) {
    if (!confirm("Are you sure you want to delete this image?")) return;

    fetch("/delete_image", {
        method: "POST",
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ image_path: imagePath })
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            alert("Image deleted successfully.");
            location.reload();
        } else {
            alert("Failed to delete image.");
        }
    })
    .catch(err => {
        console.error("Error deleting image:", err);
    });
} 
