$(document).ready(function () {

  toastr.options = {
      "positionClass": "toast-bottom-center", // Bottom left corner
      "timeOut": "3000",             // Auto hide after 3s
      "extendedTimeOut": "1000",
      "preventDuplicates": true
  };

  $('#btn-search-name').click(function(){
    const first = $('#inp-firstname').val().trim();
    const last = $('#inp-lastname').val().trim();
    if(!first || !last){
        toastr.error("Enter both first and last name");
        return;
    }
    // Call backend Apps Script to fetch registration
  });

});
