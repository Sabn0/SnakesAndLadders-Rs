
const { invoke } = window.__TAURI__.tauri;
const assets_path = "assets/";

async function build_board(board_dim, board_length) {

  // leave us with empty screen
  document.querySelector("#start_screen").remove();

  // random colors
  let colors = Array(
    "BurlyWood", 
    "Chocolate", 
    "Wheat", 
    "Coral", 
    "DarkGoldenRod", 
    "DarkOrange", 
    "Gold", 
    "GoldenRod", 
    "Orange", 
    "OrangeRed", 
    "Yellow"
  );

  // create a colored square for every position on the board
  let canvas = document.createElement("canvas");
  canvas.id = "board_canvas";
  canvas.style.position = "relative";
  document.querySelector("#container").appendChild(canvas);

  let ctx = canvas.getContext("2d");
  ctx.canvas.width  = window.innerWidth;
  ctx.canvas.height = window.innerHeight;
  ctx.canvas.top_left_x = 0;
  ctx.canvas.top_left_y = 0;
  let square_length = board_length / board_dim;

  for (var i = 0; i < board_dim; i++) {
      for (var j = 0; j < board_dim; j++) {
        
        ctx.beginPath();
        ctx.lineWidth = "2";
        ctx.rect(i*square_length, j*square_length, square_length, square_length);
        ctx.fillStyle = colors[Math.floor(Math.random()*colors.length)];
        ctx.fill();
        ctx.strokeStyle = "black";  
        ctx.stroke();
        let label = (board_dim*board_dim) - (j*board_dim + (board_dim-i));
        let add_to_pos = square_length / 4;
        ctx.font = "15px Arial";
        ctx.fillStyle = "black";
        ctx.fillText(label.toString(), add_to_pos + i*square_length, add_to_pos + j*square_length); 

      }
  }

}

async function build_sliders(items, type, board_dim, board_length) {

  // receive an array of ladders or snakes of shape [[start, end], [start, end], ...]
  // draw the items on the array 

  let square_length = board_length / board_dim;
  let canvas = document.querySelector("#board_canvas");
  let asset = assets_path + type + ".png";
  let ctx = canvas.getContext("2d");

  for (var i = 0; i < items.length; i++) {

    let start = items[i][0];
    let end = items[i][1];

    // top left x y computation
    let y_end = board_length - (board_length * (Math.floor(end / board_dim) / board_dim)) - (square_length / 2);
    let x_end = board_length * ((end % board_dim) / board_dim) + (square_length / 2);
    let y_start = board_length - (board_length * (Math.floor(start / board_dim) / board_dim)) - (square_length / 2);
    let x_start = board_length * ((start % board_dim) / board_dim) + (square_length / 2);
    let top_left_x = Math.min(x_start, x_end);
    let top_left_y = Math.min(y_start, y_end);
    let bottom_right_x = Math.max(x_start, x_end);
    let bottom_right_y = Math.max(y_start, y_end);

    // rotation computation
    let adjacent = bottom_right_y - top_left_y;
    let opposite = bottom_right_x - top_left_x; 
    let hypotenuse = Math.sqrt(adjacent*adjacent + opposite*opposite);
    let angle_radians = Math.acos(adjacent/hypotenuse);
    let angle_degress = angle_radians * 180 / Math.PI;
    if (x_start > x_end) {
      angle_degress = 360 - angle_degress;
    }
    let rotation = (angle_degress * Math.PI) / 180;

    // width and height computations
    let height = hypotenuse;
    let width = square_length / 2;

    var img = new Image();
    img.src = asset;
    
    img.onload = function () {

      ctx.save();

      ctx.translate(x_end, y_end);
      ctx.rotate( rotation );
      ctx.drawImage(img, 0, 0, width, height);

      ctx.restore();

    };

  }

}

async function build_players(n) {
  
  // make n players (typical n=2) that are dragable around the board
  // https://www.w3schools.com/howto/howto_js_draggable.asp
  function make_draggable(element) {

    let old_x=0;
    let old_y=0;
    let new_x=0;
    let new_y=0;
    element.onmousedown = drag_mouse_down;

    function drag_mouse_down(e) {

      e.preventDefault();
      old_x = e.clientX;
      old_y = e.clientY;
      
      document.onmouseup = close_drag;
      document.onmousemove = drag;

    }

    function drag(e) {

      e.preventDefault();
      new_x = old_x - e.clientX;
      new_y = old_y - e.clientY;
      old_x = e.clientX;
      old_y = e.clientY;

      element.style.top = (element.offsetTop - new_y) + "px";
      element.style.left = (element.offsetLeft - new_x) + "px";
    }


    function close_drag(e) {
      document.onmouseup = null;
      document.onmousemove = null;
    }

  }

  let canvas = document.querySelector("#board_canvas");
  let container = document.querySelector("#container");

  // receive number of players and build img objects
  for (var i = 0; i < n; i ++ ) {
    
    // height position
    let top = (canvas.height - 50).toString() + "px";
    let left = (10 + (i * 2.5 * 10)).toString() + "px";

    let player_id = "player" + i.toString();
    let asset = assets_path + player_id + ".png";
    
    let player = document.createElement('img');
    player.src = asset;
    player.width = "20";
    player.height = "20";
    player.style.position = "absolute";
    player.style.top = top;
    player.style.left = left;
    player.id = player_id;
    container.appendChild(player);
    make_draggable(player);
  }

}

async function build_dice() {

  let container = document.querySelector("#container");
  
  let roll_button = document.createElement("button");
  roll_button.type = "button";
  roll_button.innerHTML = "Roll!";
  roll_button.id = "roll_button";
  container.appendChild(roll_button);

  let roll_show = document.createElement("label");
  roll_show.textContent = "";
  roll_show.id = "roll_show";
  container.appendChild(roll_show);
  
}

window.addEventListener("DOMContentLoaded", async function () {

  container = document.querySelector("#container");
  let board_dim = 10;
  let board_length = 600;

  document.querySelector("#start_button").addEventListener("click", async function (e) {

    // retrive serialized board from backend
    let board = await invoke('init_game').then((response) => response ).catch((e) => console.error(e));

    // build initial screen (board, snakes, ladders, draggable players, dice)
    e.preventDefault();
    await build_board(board_dim, board_length);
    build_sliders(board.ladders, "ladder", board_dim, board_length);
    build_sliders(board.snakes, "snake", board_dim, board_length);
    build_players(2);
    build_dice();

    // set listener for dice
    document.querySelector("#roll_button").addEventListener("click", async function (e) {

      let roll_value = await invoke('draw_turn').then((response) => response).catch((e) => console.error(e));
      // set rolled value on screen for user
      document.querySelector("#roll_show").innerHTML = roll_value;

    });


  });

});
