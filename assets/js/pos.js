let products = [];
let carts = [];

// DOM Ready
$(document).ready(function () {

    /* ------------------- LOGOUT ------------------- */
    $("#nav-logout").click(function(e) {
        e.preventDefault();
        localStorage.removeItem("isLoggedIn");
        localStorage.removeItem("user");
        window.location.href = "./";
    });

    /* ------------------- TOASTR OPTIONS ------------------- */
    toastr.options = {
        "positionClass": "toast-bottom-center",
        "timeOut": "3000",
        "extendedTimeOut": "1000",
        "preventDuplicates": true
    };

    /* ------------------- LOAD PRODUCTS ------------------- */
    loadProducts();

    async function loadProducts() {
        const $select = $("#sel-products");
        $select.prop('disabled', true).html('<option value="">Loading...</option>');

        // Get products via api.js with offline cache fallback
        products = await getProducts();

        $select.empty().append('<option value="">Select Item</option>');

        for (const product of products) {
            $select.append(`<option value="${product.id}">${product.name}</option>`);
        }

        $select.prop('disabled', false);
    }

    /* ------------------- PRODUCT SELECTION ------------------- */
    $("#sel-products").change(function () {
        const productId = $(this).val();
        if (!productId) return toastr.error("Unknown select product!");

        const product = products.find(p => p.id === productId);

        const modal = $("#mdl-add-item");
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

    /* ------------------- QUANTITY BUTTONS ------------------- */
    $("#btn-increase").click(() => {
        let qty = parseFloat($("#inp-quantity").val()) || 1;
        $("#inp-quantity").val(qty + 1);
    });
    $("#btn-decrease").click(() => {
        let qty = parseFloat($("#inp-quantity").val()) || 1;
        if(qty > 1) $("#inp-quantity").val(qty - 1);
    });

    /* ------------------- ADD ITEM TO CART ------------------- */
    $("#btn-add-item").click(() => {
        const id = $("#inp-id").val();
        const name = $("#lbl-item-title").text();
        const unitPrice = parseFloat($("#inp-unit-price").val());
        const profit = parseFloat($("#inp-profit").val());
        const stockOnHand = parseFloat($("#inp-stock-on-hand").val());
        const quantity = parseFloat($("#inp-quantity").val()) || 0;
        const sellingPrice = parseFloat($("#inp-selling-price").val());
        const totalAmount = quantity * sellingPrice;

        if(stockOnHand <=0) return toastr.error("Insufficient stock!");
        if(quantity <=0) return toastr.error("Invalid quantity!");

        const existingIndex = carts.findIndex(i => i.id === id);
        if(existingIndex === -1) {
            if(quantity > stockOnHand) return toastr.error("Quantity exceeds stock!");
            carts.push({id, name, unitPrice, profit, quantity, sellingPrice, totalAmount});
        } else {
            let newQty = carts[existingIndex].quantity + quantity;
            if(newQty > stockOnHand) return toastr.error("Quantity exceeds stock!");
            carts[existingIndex].quantity = newQty;
            carts[existingIndex].totalAmount = carts[existingIndex].sellingPrice * newQty;
        }

        updateCartUI();
        toastr.success(`Added ${quantity} item(s)!`);
        $("#mdl-add-item").modal("hide");
    });

    /* ------------------- UPDATE CART UI ------------------- */
    function updateCartUI() {
        const $div = $("#div-added-items");
        $div.empty();
        let totalAmount = 0;

        carts.forEach((item, index) => {
            totalAmount += item.totalAmount;

            const html = `
                <div class="d-flex justify-content-between align-items-center mb-2 border p-2 rounded">
                    <div><strong>${item.name}</strong><br>Qty: ${item.quantity} x ₱${item.sellingPrice} = ₱${item.totalAmount}</div>
                    <button class="btn btn-sm btn-danger btn-remove" data-index="${index}">
                        <i class="bi bi-trash"></i>
                    </button>
                </div>`;
            $div.append(html);
        });

        $("#inp-amount-due").val(totalAmount);
        $("#inp-cash-received").val(totalAmount);
        $("#inp-changed").val(0);
    }

    /* ------------------- REMOVE CART ITEM ------------------- */
    $(document).on("click", ".btn-remove", function() {
        const index = $(this).data("index");
        carts.splice(index, 1);
        updateCartUI();
    });

    /* ------------------- CASH INPUT ------------------- */
    $("#inp-cash-received").on("input", function() {
        const amountDue = parseFloat($("#inp-amount-due").val()) || 0;
        const cashReceived = parseFloat($(this).val()) || 0;
        $("#inp-changed").val(cashReceived - amountDue);
    });
    $("#btn-clear-cash").click(function() {
        $("#inp-cash-received").val("").focus();
        $("#inp-changed").val(0);
    });

    /* ------------------- PAYMENT ------------------- */
    $("#btn-cash").click(async () => {
        const amountDue = parseFloat($("#inp-amount-due").val()) || 0;
        const cashReceived = parseFloat($("#inp-cash-received").val()) || 0;

        if(carts.length === 0) return toastr.error("No products added!");
        if(cashReceived < amountDue) return toastr.error("Insufficient cash!");

        const btnCash = $("#btn-cash");
        const btnCredit = $("#btn-credit");
        btnCash.prop("disabled", true).text("Processing...");
        btnCredit.prop("disabled", true);

        // Use api.js for offline-safe call
        const response = await postPayment(carts, "cashPayment", amountDue, cashReceived, cashReceived - amountDue);

        if(response.offline){
            toastr.info("Payment queued offline!");
        } else if(response.success){
            toastr.success("Payment successful!");
        } else {
            toastr.error("Payment failed!");
        }

        carts = [];
        updateCartUI();
        await loadProducts();

        btnCash.prop("disabled", false).text("Cash");
        btnCredit.prop("disabled", false);
    });

});
