// -------------------- GLOBAL VARIABLES --------------------
let products = [];
let carts = [];
let offlineQueue = JSON.parse(localStorage.getItem('offlineQueue') || '[]');

// -------------------- DOCUMENT READY --------------------
$(document).ready(function () {

  // -------------------- TOASTR SETTINGS --------------------
  toastr.options = {
    positionClass: "toast-bottom-center",
    timeOut: "3000",
    extendedTimeOut: "1000",
    preventDuplicates: true
  };

  // -------------------- LOGOUT --------------------
  $("#nav-logout").click(function(e){
    e.preventDefault();
    localStorage.removeItem("isLoggedIn");
    localStorage.removeItem("user");
    window.location.href = "index.html";
  });

  // -------------------- ACTIVE NAV --------------------
  const path = window.location.pathname.split("/").pop();
  if(path==="pos.html") $("#nav-pos").addClass("active");
  if(path==="products.html") $("#nav-products").addClass("active");
  if(path==="sales.html") $("#nav-sales").addClass("active");

  // -------------------- CLEAR CASH --------------------
  $("#btn-clear-cash").click(function(){
    $("#inp-cash-received").val("").focus();
    const amountDue = parseFloat($("#inp-amount-due").val()) || 0;
    $("#inp-changed").val(-amountDue);
  });

  // -------------------- LOAD PRODUCTS --------------------
  loadProducts();

  async function loadProducts(){
    const $select = $('#sel-products');
    $select.prop('disabled', true).html('<option>Loading...</option>');

    // Load cached products first
    const cached = localStorage.getItem('products');
    if(cached){
      products = JSON.parse(cached);
      renderProducts(products);
    }

    // Fetch from API
    try{
      const response = await $.ajax({
        url: API_URL,
        method: "GET",
        data: { action:"getServices" }
      });

      const data = typeof response === "string" ? JSON.parse(response) : response;
      products = data.products || [];

      // Cache locally
      localStorage.setItem('products', JSON.stringify(products));
      renderProducts(products);

    } catch(err){
      console.log("Failed to fetch products:", err);
      toastr.warning("Using cached products due to offline/API error");
      $select.prop('disabled', false);
    }
  }

  function renderProducts(list){
    const $select = $("#sel-products");
    $select.empty().append('<option value="">Select Item</option>');
    list.forEach(p=>{
      $select.append(`<option value="${p.id}">${p.name}</option>`);
    });
    $select.prop('disabled', false);
  }

  // -------------------- PRODUCT SELECTION --------------------
  $("#sel-products").change(function(){
    const id = $(this).val();
    if(!id) return toastr.error("Unknown select product!");

    const product = products.find(p=>p.id===id);
    if(!product) return toastr.error("Product not found!");

    // Fill modal
    $("#lbl-item-title").text(product.name);
    $("#inp-id").val(product.id);
    $("#inp-unit-price").val(product.unitPrice);
    $("#inp-profit").val(product.profit);
    $("#inp-stock-on-hand").val(product.stockOnHand);
    $("#inp-selling-price").val(product.sellingPrice);
    $("#inp-quantity").val(1);

    $("#mdl-add-item").modal("show");
    $("#sel-products").val(null);
  });

  // -------------------- QUANTITY BUTTONS --------------------
  $("#btn-increase").click(()=>changeQuantity(1));
  $("#btn-decrease").click(()=>changeQuantity(-1));

  function changeQuantity(delta){
    let qty = parseFloat($("#inp-quantity").val()) || 1;
    qty = Math.max(0.5, qty + delta);
    $("#inp-quantity").val(qty);
  }

  // -------------------- ADD TO CART --------------------
  $("#btn-add-item").click(function(){
    const id = $("#inp-id").val();
    const unitPrice = parseFloat($("#inp-unit-price").val());
    const profit = parseFloat($("#inp-profit").val());
    const name = $("#lbl-item-title").text();
    const stockOnHand = parseFloat($("#inp-stock-on-hand").val());
    const quantity = parseFloat($("#inp-quantity").val());
    const sellingPrice = parseFloat($("#inp-selling-price").val());
    const totalAmount = quantity * sellingPrice;

    if(stockOnHand <=0) return toastr.error("Insufficient stock!");
    if(quantity<=0) return toastr.error("Enter valid quantity!");

    const existingIndex = carts.findIndex(item=>item.id===id);
    if(existingIndex===-1){
      if(quantity>stockOnHand) return toastr.error("Quantity exceeds stock!");
      carts.push({ id, unitPrice, name, quantity, sellingPrice, profit, totalAmount });
    } else {
      let newQty = carts[existingIndex].quantity + quantity;
      if(newQty>stockOnHand) return toastr.error("Quantity exceeds stock!");
      carts[existingIndex].quantity = newQty;
      carts[existingIndex].totalAmount = newQty * sellingPrice;
    }

    updateCartUI();
    toastr.success(`Added ${quantity} item(s) successfully!`);
    $("#mdl-add-item").modal("hide");
  });

  // -------------------- UPDATE CART UI --------------------
  function updateCartUI(){
    const $div = $("#div-added-items");
    $div.empty();
    let totalDue = 0;

    carts.forEach((item,index)=>{
      totalDue += item.totalAmount;
      const itemHtml = `
        <div class="d-flex justify-content-between align-items-center mb-2 border p-2 rounded">
          <div>
            <strong>${item.name}</strong><br>
            Qty: ${item.quantity} x ₱${item.sellingPrice} = ₱${item.totalAmount.toFixed(2)}
          </div>
          <button class="btn btn-sm btn-danger btn-remove" data-index="${index}">
            <i class="bi bi-trash"></i>
          </button>
        </div>`;
      $div.append(itemHtml);
    });

    $("#inp-amount-due").val(totalDue.toFixed(2));
    $("#inp-cash-received").val(totalDue.toFixed(2));
    $("#inp-changed").val(0);
  }

  // -------------------- REMOVE ITEM --------------------
  $(document).on("click",".btn-remove",function(){
    const index = $(this).data("index");
    carts.splice(index,1);
    updateCartUI();
  });

  // -------------------- CASH INPUT --------------------
  $("#inp-cash-received").on("input",function(){
    const due = parseFloat($("#inp-amount-due").val()) || 0;
    const cash = parseFloat($(this).val()) || 0;
    $("#inp-changed").val((cash - due).toFixed(2));
  });

  // -------------------- CASH PAYMENT --------------------
  $("#btn-cash").click(function(){
    const amountDue = parseFloat($("#inp-amount-due").val()) || 0;
    const cashReceived = parseFloat($("#inp-cash-received").val()) || 0;
    const changed = parseFloat($("#inp-changed").val()) || 0;

    if(carts.length===0) return toastr.error("No added product!");
    if(cashReceived < amountDue) return toastr.error("Insufficient cash!");

    const btnCash = $(this);
    btnCash.prop('disabled', true).text('Processing...');

    const payload = { action:"cashPayment", amountDue, cashReceived, changed, carts };

    $.ajax({
      url: API_URL,
      method:"POST",
      data: JSON.stringify(payload),
      contentType: "application/json",
      success: function(){
        carts = [];
        updateCartUI();
        toastr.success("Cash payment saved!");
        btnCash.prop('disabled', false).text('Cash');
      },
      error: function(){
        offlineQueue.push(payload);
        localStorage.setItem('offlineQueue', JSON.stringify(offlineQueue));
        carts = [];
        updateCartUI();
        toastr.warning("Offline: payment queued");
        btnCash.prop('disabled', false).text('Cash');
      }
    });
  });

  // -------------------- OFFLINE QUEUE SYNC --------------------
  function syncOfflineQueue(){
    if(offlineQueue.length===0 || !navigator.onLine) return;
    const queueCopy = [...offlineQueue];
    queueCopy.forEach((payload,index)=>{
      $.ajax({
        url: API_URL,
        method:"POST",
        data: JSON.stringify(payload),
        contentType:"application/json",
        success: function(){
          offlineQueue.splice(index,1);
          localStorage.setItem('offlineQueue', JSON.stringify(offlineQueue));
          toastr.success("Offline payment synced!");
        }
      });
    });
  }

  window.addEventListener("online", syncOfflineQueue);
  syncOfflineQueue();

});
