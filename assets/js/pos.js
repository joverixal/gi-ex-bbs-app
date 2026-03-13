let products = [];
let carts = [];
let offlineQueue = JSON.parse(localStorage.getItem('offlineQueue') || '[]');

$(document).ready(function () {

    // -------------------- Logout --------------------
    $("#nav-logout").click(function(e) {
        e.preventDefault();
        localStorage.removeItem("isLoggedIn");
        localStorage.removeItem("user");
        window.location.href = "/ge-ix-bbs-app/";
    });

    toastr.options = {
        "positionClass": "toast-bottom-center",
        "timeOut": "3000",
        "extendedTimeOut": "1000",
        "preventDuplicates": true
    };

    // -------------------- Load Products --------------------
    loadProducts();

    async function loadProducts() {
        const $select = $('#sel-products');
        $select.prop('disabled', true).html('<option value="">Loading...</option>');

        // Try to load from cache first
        const cached = localStorage.getItem('products');
        if (cached) {
            renderProducts(JSON.parse(cached));
        }

        // Try to fetch from API
        try {
            const response = await $.ajax({
                url: API_URL,
                method: "GET",
                data: { action: "getServices" }
            });

            let data = typeof response === "string" ? JSON.parse(response) : response;
            products = data.products || [];

            // Cache products locally
            localStorage.setItem('products', JSON.stringify(products));

            renderProducts(products);
        } catch (err) {
            console.log("Failed to load products from API, using cached if available", err);
            toastr.warning("Using cached products due to offline or API error");
            $select.prop('disabled', false);
        }
    }

    function renderProducts(productsList) {
        const $select = $('#sel-products');
        $select.empty().append('<option value="">Select Item</option>');
        productsList.forEach(p => {
            $select.append(`<option value="${p.id}">${p.name}</option>`);
        });
        $select.prop('disabled', false);
    }

    // -------------------- Product Selection --------------------
    $("#sel-products").change(function () {
        const productId = $(this).val();
        if (!productId) {
            toastr.error("Unknown select product!");
            return;
        }
        const product = products.find(a => a.id === productId);

        const modal = $('#mdl-add-item');
        modal.find("#lbl-item-title").text(product.name);
        modal.find("#inp-id").val(product.id);
        modal.find("#inp-unit-price").val(product.unitPrice);
        modal.find("#inp-profit").val(product.profit);
        modal.find("#inp-stock-on-hand").val(product.stockOnHand);
        modal.find("#inp-selling-price").val(product.sellingPrice);
        modal.find("#inp-quantity").val(1);

        modal.modal("show");
        $("#sel-products").val(null);
    });

    $("#btn-increase").click(() => changeQuantity(1));
    $("#btn-decrease").click(() => changeQuantity(-1));

    function changeQuantity(delta) {
        let qty = parseFloat($("#inp-quantity").val()) || 1;
        qty = Math.max(0.5, qty + delta);
        $("#inp-quantity").val(qty);
    }

    // -------------------- Add to Cart --------------------
    $("#btn-add-item").click(function () {
        const id = $("#inp-id").val();
        const unitPrice = $("#inp-unit-price").val();
        const profit = $("#inp-profit").val();
        const name = $("#lbl-item-title").text();
        const stockOnHand = $("#inp-stock-on-hand").val();
        const quantity = parseFloat($('#inp-quantity').val()) || 0;
        const sellingPrice = parseFloat($("#inp-selling-price").val());
        const totalAmount = quantity * sellingPrice;

        const existingIndex = carts.findIndex(item => item.id === id);

        if (stockOnHand <= 0) return toastr.error("Insufficient stock!");
        if (quantity <= 0) return toastr.error("Enter a valid quantity!");
        if (existingIndex === -1) {
            if (quantity > stockOnHand) return toastr.error("Quantity exceeds stock!");
            carts.push({ id, unitPrice, name, quantity, sellingPrice, profit, totalAmount });
        } else {
            let totalQuantity = quantity + carts[existingIndex].quantity;
            if (totalQuantity > stockOnHand) return toastr.error("Quantity exceeds stock!");
            carts[existingIndex].quantity += quantity;
            carts[existingIndex].totalAmount = carts[existingIndex].quantity * carts[existingIndex].sellingPrice;
        }

        updateCartUI();
        toastr.success(`Added ${quantity} item(s) successfully!`);
        $("#mdl-add-item").modal("hide");
    });

    // -------------------- Update Cart UI --------------------
    function updateCartUI() {
        $("#div-added-items").empty();
        let totalAmountDue = 0;

        carts.forEach((item, index) => {
            totalAmountDue += item.totalAmount;
            const itemHtml = `
                <div class="d-flex justify-content-between align-items-center mb-2 border p-2 rounded">
                    <div>
                        <strong>${item.name}</strong><br>
                        Qty: ${item.quantity} x ₱${item.sellingPrice} = ₱${item.totalAmount}
                    </div>
                    <button class="btn btn-sm btn-danger btn-remove" data-index="${index}">
                      <i class="bi bi-trash"></i>
                    </button>
                </div>
            `;
            $("#div-added-items").append(itemHtml);
        });

        $("#inp-amount-due").val(totalAmountDue);
        $("#inp-cash-received").val(totalAmountDue);
        $("#inp-changed").val(0);
    }

    $(document).on("click", ".btn-remove", function () {
        const index = $(this).data("index");
        carts.splice(index, 1);
        updateCartUI();
    });

    // -------------------- Cash Input --------------------
    $("#inp-cash-received").on("input", function () {
        const amountDue = parseFloat($('#inp-amount-due').val()) || 0;
        const cashReceived = parseFloat($(this).val()) || 0;
        $("#inp-changed").val(cashReceived - amountDue);
    });

    $("#btn-clear-cash").click(function () {
        $("#inp-cash-received").val("").focus();
        const amountDue = parseFloat($('#inp-amount-due').val()) || 0;
        $("#inp-changed").val(-amountDue);
    });

    // -------------------- Cash Payment --------------------
    $("#btn-cash").click(function () {
        const amountDue = parseFloat($('#inp-amount-due').val()) || 0;
        const cashReceived = parseFloat($('#inp-cash-received').val()) || 0;
        const changed = parseFloat($('#inp-changed').val()) || 0;

        if (carts.length === 0) return toastr.error("No added product!");
        if (cashReceived < amountDue) return toastr.error("Insufficient cash!");

        const btnCash = $('#btn-cash');
        const btnCredit = $('#btn-credit');
        btnCash.prop('disabled', true).text('Processing...');
        btnCredit.prop('disabled', true);

        const payload = {
            action: "cashPayment",
            amountDue,
            cashReceived,
            changed,
            carts
        };

        $.ajax({
            url: API_URL,
            method: "POST",
            data: JSON.stringify(payload),
            contentType: "application/json",
            success: function () {
                carts = [];
                updateCartUI();
                toastr.success("Cash payment saved!");

                btnCash.prop('disabled', false).text('Cash');
                btnCredit.prop('disabled', false);
            },
            error: function () {
                // Save to offline queue
                offlineQueue.push(payload);
                localStorage.setItem('offlineQueue', JSON.stringify(offlineQueue));
                carts = [];
                updateCartUI();
                toastr.warning("Offline: payment queued");

                btnCash.prop('disabled', false).text('Cash');
                btnCredit.prop('disabled', false);
            }
        });
    });

    // -------------------- Sync Offline Queue --------------------
    function syncOfflineQueue() {
        if (offlineQueue.length === 0) return;

        const queueCopy = [...offlineQueue];
        queueCopy.forEach((payload, index) => {
            $.ajax({
                url: API_URL,
                method: "POST",
                data: JSON.stringify(payload),
                contentType: "application/json",
                success: function () {
                    offlineQueue.splice(index, 1);
                    localStorage.setItem('offlineQueue', JSON.stringify(offlineQueue));
                    toastr.success("Offline payment synced!");
                }
            });
        });
    }

    window.addEventListener("online", syncOfflineQueue);
    syncOfflineQueue(); // Try syncing immediately if online

});
