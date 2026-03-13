let products = [];
let carts = [];

$(document).ready(function () {

    $("#nav-logout").click(function(e) {
        e.preventDefault();  // Prevent default link behavior
    
        // Clear login/session info
        localStorage.removeItem("isLoggedIn");
        localStorage.removeItem("user");
    
        // Optional: clear everything if you want
        // localStorage.clear();
    
        // Redirect to root without showing index.html
        window.location.href = "/gi-ex-bbs-app/";
    });

    toastr.options = {
        "positionClass": "toast-bottom-center", // Bottom left corner
        "timeOut": "3000",             // Auto hide after 3s
        "extendedTimeOut": "1000",
        "preventDuplicates": true
    };

    loadProducts();

    function loadProducts() {

        var $select = $('#sel-products');

        // Disable select and show loading text
        $select.prop('disabled', true);
        $select.html('<option value="">Loading...</option>');

        $.ajax({
            url: API_URL,
            method: "GET",
            data: {
                action: "getServices"
            },
            success: function (response) {

                if (typeof response === "string") {
                    response = JSON.parse(response);
                }

                products = response.products;

                $select.empty();
                $select.append(`<option value="">Select Item</option>`);

                for(let i = 0; i < products.length; i++){
                    const product = products[i];
                    
                    $("#sel-products").append(`
                        <option value="${product.id}">
                            ${product.name}
                        </option>
                    `);
                }

                $select.prop('disabled', false);
            },
            error: function (err) {
                console.log("Error loading products", err);
                alert("Failed to load products");
                $select.prop('disabled', false);
            }
        });

    }

    $("#sel-products").change(function () {

        const productId = $(this).val();

        if (!productId) {
            toastr.error("Unkwown select product!");
            return;
        };

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

    $("#btn-increase").click(function() {
        let qty = parseFloat($("#inp-quantity").val()) || 1;
        $("#inp-quantity").val(qty + 1);
    });
    
    $("#btn-decrease").click(function() {
        let qty = parseFloat($("#inp-quantity").val()) || 1;
        if (qty > 1) $("#inp-quantity").val(qty - 1);
    });

    $("#btn-add-item").click(function () {
        const id = $("#inp-id").val();
        const unitPrice = $("#inp-unit-price").val();
        const profit = $("#inp-profit").val();
        const name = $("#lbl-item-title").text();
        const stockOnHand = $("#inp-stock-on-hand").val();
        const quantity = parseFloat($('#inp-quantity').val()) || 0
        const sellingPrice = parseFloat($("#inp-selling-price").val());
        const totalAmount = quantity * sellingPrice;

        const existingIndex = carts.findIndex(item => item.id === id);
        
        if(stockOnHand <=0){
            toastr.error("Insuficient stock on hand!");
            return;
        }

        if(quantity <=0){
            toastr.error("Please enter a valid quantity!");
            return;
        }
    
        if (existingIndex === -1) {

            if(quantity > stockOnHand){
                toastr.error("Please enter a valid quantity!");
                return;
            }
            carts.push({
                id,
                unitPrice,
                name,
                quantity,
                sellingPrice,
                profit,
                totalAmount: sellingPrice * quantity
            });
        } else {

            var totalQuantity = quantity + carts[existingIndex].quantity;
            if(totalQuantity > stockOnHand){
                toastr.error("Insuficient stock on hand!");
            return;
            }
            
            // Update quantity and totalAmount
            carts[existingIndex].quantity += quantity;
            carts[existingIndex].totalAmount = carts[existingIndex].sellingPrice * carts[existingIndex].quantity;
        }
    
        updateCartUI();

        toastr.success(`Added ${quantity} item(s) successfully!`);

        $("#mdl-add-item").modal("hide");
    });

    $("#inp-cash-received").keyup(function () {
        const amountDue = parseFloat($('#inp-amount-due').val()) || 0;
        const cashReceived = parseFloat($(this).val()) || 0;

        const changed = cashReceived - amountDue;
        $("#inp-changed").val(changed);
    });

    $("#btn-clear-cash").click(function() {
        $("#inp-cash-received").val("").focus();

        const amountDue = parseFloat($('#inp-amount-due').val()) || 0;
        const cashReceived = parseFloat($(this).val()) || 0;

        const changed = cashReceived - amountDue;
        $("#inp-changed").val(changed);
    });

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
    
    // Remove product
    $(document).on("click", ".btn-remove", function() {
        const index = $(this).data("index");
        carts.splice(index, 1);
        updateCartUI();
    });

    $("#btn-cash").click(function () {

        const amountDue = parseFloat($('#inp-amount-due').val()) || 0;
        const cashReceived = parseFloat($('#inp-cash-received').val()) || 0;
        const changed = parseFloat($('#inp-changed').val()) || 0;

        if (carts.length === 0) {
            toastr.error("No added product!");
            return;
        }
        if (cashReceived < amountDue) {
            toastr.error("Insuficient cash received!");
            return;
        }

        const btnCash = $('#btn-cash');
        const btnCredit = $('#btn-credit');
        btnCash.prop('disabled', true).text('Cash - Processing...');
        btnCredit.prop('disabled', true);
        
        $.ajax({
            url: API_URL,
            method: "GET",
            data: {
                action: "cashPayment",
                amountDue: amountDue,
                cashReceived: cashReceived,
                changed: changed,
                carts: JSON.stringify(carts)
            },
            success: function (response) {
                $("#sel-products").val(null);
                loadProducts();
                carts=[];
                updateCartUI();
                toastr.success("Cash payment successfully saved!");

                btnCash.prop('disabled', false).text('Cash');
                btnCredit.prop('disabled', false);
            },
            error: function (err) {
                console.log("Error loading products", err);
                btnCash.prop('disabled', false).text('Cash');
                btnCredit.prop('disabled', false);
                alert("Failed to load products");
            }
        });

    });

});
