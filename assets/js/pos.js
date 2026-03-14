let products = []
let carts = []

let offlineQueue = JSON.parse(localStorage.getItem('offlineQueue') || '[]')

$(document).ready(function () {

toastr.options = {
positionClass: "toast-bottom-center",
timeOut: "3000"
}

loadProducts()

async function loadProducts(){

const cached = localStorage.getItem("products")

if(cached){
renderProducts(JSON.parse(cached))
}

try{

const response = await $.ajax({
url: API_URL,
method:"GET",
data:{ action:"getServices" }
})

let data = typeof response === "string" ? JSON.parse(response) : response

products = data.products || []

localStorage.setItem("products", JSON.stringify(products))

renderProducts(products)

}catch(err){

toastr.warning("Offline mode: using cached products")

}

}


function renderProducts(list){

const $select = $("#sel-products")

$select.empty().append(`<option value="">Select Item</option>`)

list.forEach(p=>{

$select.append(`
<option value="${p.id}">
${p.name}
</option>
`)

})

$select.prop("disabled",false)

}


$("#sel-products").change(function(){

const productId = $(this).val()

const product = products.find(p=>p.id === productId)

if(!product) return

$("#lbl-item-title").text(product.name)

$("#inp-id").val(product.id)
$("#inp-unit-price").val(product.unitPrice)
$("#inp-profit").val(product.profit)
$("#inp-stock-on-hand").val(product.stockOnHand)
$("#inp-selling-price").val(product.sellingPrice)
$("#inp-quantity").val(1)

$("#mdl-add-item").modal("show")

})


$("#btn-add-item").click(function(){

const id = $("#inp-id").val()

const name = $("#lbl-item-title").text()

const quantity = parseFloat($("#inp-quantity").val())

const price = parseFloat($("#inp-selling-price").val())

const total = quantity * price

const existing = carts.find(c=>c.id===id)

if(existing){

existing.quantity += quantity
existing.totalAmount = existing.quantity * price

}else{

carts.push({
id,
name,
quantity,
sellingPrice:price,
totalAmount:total
})

}

updateCartUI()

$("#mdl-add-item").modal("hide")

})


function updateCartUI(){

const container = $("#div-added-items")

container.empty()

let total = 0

carts.forEach((item,index)=>{

total += item.totalAmount

container.append(`
<div class="d-flex justify-content-between align-items-center border p-2 rounded">

<div>
<strong>${item.name}</strong><br>
Qty: ${item.quantity} x ₱${item.sellingPrice}
</div>

<button class="btn btn-sm btn-danger btn-remove"
data-index="${index}">
<i class="bi bi-trash"></i>
</button>

</div>
`)

})

$("#inp-amount-due").val(total)

}


$(document).on("click",".btn-remove",function(){

const index = $(this).data("index")

carts.splice(index,1)

updateCartUI()

})


$("#inp-cash-received").on("input",function(){

const due = parseFloat($("#inp-amount-due").val()) || 0
const cash = parseFloat($(this).val()) || 0

$("#inp-changed").val(cash-due)

})


$("#btn-cash").click(function(){

const amountDue = parseFloat($("#inp-amount-due").val())
const cash = parseFloat($("#inp-cash-received").val())

if(carts.length===0) return toastr.error("No items")

if(cash < amountDue) return toastr.error("Insufficient cash")

const payload = {
action:"cashPayment",
amountDue,
cashReceived:cash,
carts
}

$.ajax({

url:API_URL,
method:"POST",
data:JSON.stringify(payload),
contentType:"application/json",

success:function(){

carts=[]
updateCartUI()

toastr.success("Payment saved")

},

error:function(){

offlineQueue.push(payload)

localStorage.setItem("offlineQueue",JSON.stringify(offlineQueue))

toastr.warning("Offline saved")

}

})

})


function syncOfflineQueue(){

if(!navigator.onLine) return

offlineQueue.forEach((payload,index)=>{

$.ajax({

url:API_URL,
method:"POST",
data:JSON.stringify(payload),
contentType:"application/json",

success:function(){

offlineQueue.splice(index,1)

localStorage.setItem("offlineQueue",JSON.stringify(offlineQueue))

}

})

})

}

window.addEventListener("online", syncOfflineQueue)

syncOfflineQueue()

})
