let form = document.getElementById("loginForm")

form.addEventListener("submit", async function(e){

    e.preventDefault()

    let email = document.getElementById("email").value
    let password = document.getElementById("password").value

    let response = await fetch("/login",{
        method:"POST",
        headers:{
            "Content-Type":"application/json"
        },
        body:JSON.stringify({email,password})
    })

    let result = await response.text()
    console.log(result)
    if(result === "Login Successful"){
        window.location.href = "/home"
    }
    else{
        alert(result)
    }

})