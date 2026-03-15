$(document).ready(function () {

  toastr.options = {
      "positionClass": "toast-bottom-center", // Bottom left corner
      "timeOut": "3000",             // Auto hide after 3s
      "extendedTimeOut": "1000",
      "preventDuplicates": true
  };

  // Example: handle registration button
  $('#btn-register').click(function(){
      const runner = {
          firstName: $('#inp-firstname').val(),
          lastName: $('#inp-lastname').val(),
          gender: $('#inp-gender').val(),
          birthdate: $('#inp-birthdate').val(),
          batchYear: $('#inp-batchyear').val(),
          contact: $('#inp-contact').val(),
          address: $('#inp-address').val(),
          tshirtSize: $('#inp-tshirt').val()
      };
      
      toastr.success("Successfully registered. For payment and activation, please contact your batch officer.");

    // Wait 4 seconds (4000ms) before executing
    setTimeout(function() {
        window.location.href = "qrcode.html";
    }, 10000);
      
  });

});
