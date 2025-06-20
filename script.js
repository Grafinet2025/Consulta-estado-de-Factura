// script.js

document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM Content Loaded event fired.');

    // --- CONFIGURACIÓN ---
    // ⚠️ MUY IMPORTANTE: REEMPLAZA ESTA URL con la "URL de la API de ejecución" de tu API de Apps Script
    const GOOGLE_APPS_SCRIPT_API_URL = 'https://script.google.com/macros/s/AKfycbwVqb0Rkv2yghOpJQFsqoBmAyvpkItGbJrwNP6IfQxfi5Kkdmzv08402j2DAUduns-1/exec'; // ¡VERIFICA QUE ESTA SEA LA URL CORRECTA DE TU DESPLIEGUE!

    // --- ELEMENTOS DEL DOM ---
    const rucInput = document.getElementById('rucInput'); // Referencia al input del RUC
    const buscarBtn = document.getElementById('buscarBtn');
    const limpiarBtn = document.getElementById('limpiarBtn');
    const resultadoDiv = document.getElementById('resultado');
    const appContainer = document.querySelector('.app-container');
    const topLeftDate = document.getElementById('top-left-date');
    const topRightTime = document.getElementById('top-right-time');

    console.log('rucInput:', rucInput);
    console.log('buscarBtn:', buscarBtn);
    console.log('limpiarBtn:', limpiarBtn);
    console.log('resultadoDiv:', resultadoDiv);
    console.log('appContainer:', appContainer);

    let puntosInterval; // Para la animación de "Buscando..."
    let currentPedidosData = []; // Almacenar los pedidos actualmente cargados para el desplegable

    // --- FUNCIONES DE UTILIDAD (Fecha y Hora) ---
    const mostrarFechaHora = () => {
        const now = new Date();
        const dateOptions = {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        };
        const timeOptions = {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: true
        };

        const dateString = now.toLocaleDateString('es-ES', dateOptions);
        const timeString = now.toLocaleTimeString('es-ES', timeOptions);

        if (topLeftDate) {
            topLeftDate.textContent = dateString;
        }
        if (topRightTime) {
            topRightTime.textContent = timeString;
        }
    };

    // --- FUNCIONES DE UTILIDAD (Mensajes y UI) ---
    const mostrarResultado = (mensajeHTML, tipo = '') => {
        clearInterval(puntosInterval); // Detiene la animación de puntos
        
        // Limpiar todas las clases de tipo y animación antes de añadir las nuevas
        resultadoDiv.className = 'result-display'; // Resetea a solo la clase base
        
        resultadoDiv.classList.remove('hidden'); // Asegura que se quite la clase 'hidden'
        resultadoDiv.classList.add(tipo); // Establece la clase de estilo (success, danger, info, etc.)
        resultadoDiv.innerHTML = mensajeHTML; // Inserta el mensaje HTML
        resultadoDiv.classList.add('visible'); // Hace visible el div de resultado
        resultadoDiv.style.textAlign = 'center'; // Mensaje de carga/error/inicial centrado por defecto
        resultadoDiv.style.display = 'flex'; // Asegura que sea flex para centrar contenido inicial
        console.log('mostrarResultado called. Message:', mensajeHTML, 'Type:', tipo);
    };

    const iniciarAnimacionPuntos = () => {
        console.log('iniciarAnimacionPuntos called.');
        let puntos = 0;

        resultadoDiv.classList.remove('hidden'); // Asegura que no esté hidden
        resultadoDiv.className = 'result-display info'; // Estilo para mensaje de carga
        resultadoDiv.innerHTML = 'Buscando'; // Mensaje inicial
        resultadoDiv.classList.add('visible'); // Hace visible el div
        resultadoDiv.style.textAlign = 'center'; // Centra el texto
        resultadoDiv.style.display = 'flex'; // Asegura display flex para centrado del "Buscando..."

        clearInterval(puntosInterval); // Limpia cualquier intervalo anterior para evitar duplicados

        puntosInterval = setInterval(() => {
            puntos = (puntos + 1) % 7; // Ciclo de puntos de 0 a 6
            let mensajePuntos = 'Buscando' + '.'.repeat(puntos);
            resultadoDiv.innerHTML = mensajePuntos;
        }, 300); // Actualiza cada 300ms
    };

    const limpiarPantalla = () => {
        console.log('limpiarPantalla called.');
        clearInterval(puntosInterval); // Detiene la animación de puntos
        rucInput.value = ''; // Limpia el input del RUC

        resultadoDiv.classList.add('hidden'); // AÑADE LA CLASE HIDDEN PARA INICIAR LA TRANSICIÓN DE OCULTAMIENTO
        resultadoDiv.classList.remove('shake', 'visible', 'multi-pedido-display'); // Remueve shake, visible y la clase de múltiples pedidos

        // Este setTimeout es para esperar que la transición de ocultamiento (con 'hidden') se complete
        // antes de cambiar el contenido y las clases al estado inicial.
        setTimeout(() => {
            resultadoDiv.innerHTML = '<p>Ingrese su RUC para consultar el estado de su documento.</p>';
            resultadoDiv.className = 'result-display info'; // Vuelve al estado inicial 'info'
            resultadoDiv.classList.add('visible'); // Hace visible el div nuevamente para el mensaje por defecto
            resultadoDiv.classList.remove('hidden'); // Asegura que 'hidden' se remueva
            resultadoDiv.style.color = '#333';
            resultadoDiv.style.textAlign = 'center';
            resultadoDiv.style.display = 'flex'; // Asegura display flex para centrar el mensaje inicial
        }, 500); // Coincide con la duración de la transición en CSS
        rucInput.focus(); // Vuelve a poner el foco en el input del RUC
    };

    // Nueva función para generar el HTML de una tarjeta de pedido individual
    const generarPedidoCardHtml = (pedido) => {
        let tipoClase = '';
        let estadoParaMostrar = pedido.estado || 'Estado Desconocido';

        switch (estadoParaMostrar.toLowerCase()) {
            case 'listo':
                tipoClase = 'success';
                estadoParaMostrar = 'Terminado y listo para retirar';
                break;
            case 'en proceso':
                tipoClase = 'warning';
                estadoParaMostrar = 'En proceso';
                break;
            case 'entregado':
                tipoClase = 'info-status';
                estadoParaMostrar = 'Entregado';
                break;
            default:
                tipoClase = 'info';
                break;
        }

        let fechaFormateada = 'N/A';
        if (pedido.fecha) {
            let jsDate;
            if (typeof pedido.fecha === 'number') { // Si es un número (serial de hoja de cálculo)
                jsDate = new Date(Math.round((pedido.fecha - 25569) * 24 * 60 * 60 * 1000));
            } else { // Si es una cadena de texto (ej. "2023-10-26" o "26/10/2023")
                jsDate = new Date(pedido.fecha);
            }
            if (!isNaN(jsDate.getTime())) { // Valida si la fecha es válida
                fechaFormateada = jsDate.toLocaleDateString('es-ES', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                });
            }
        }

        return `
            <div class="pedido-card ${tipoClase}">
                <div class="result-line"><strong>RUC:</strong> ${pedido.ruc || 'N/A'}</div>
                <div class="result-line"><strong>Cliente:</strong> ${pedido.nombreCliente || 'N/A'}</div>
                <div class="result-line"><strong>Fecha de Pedido:</strong> ${fechaFormateada}</div>
                <div class="result-line"><strong>Estado:</strong> <span class="status-pill">${estadoParaMostrar}</span></div>
            </div>
        `;
    };

    // Nueva función para mostrar los detalles del pedido seleccionado en el desplegable
    const mostrarPedidoSeleccionado = (index) => {
        const selectedPedido = currentPedidosData[index];
        if (selectedPedido) {
            const detailsContainer = document.getElementById('selectedPedidoDetails');
            if (detailsContainer) {
                // Remueve todas las clases de estado previas de la tarjeta interna
                detailsContainer.className = 'pedido-card'; // Resetea a solo la clase base
                
                const pedidoHtml = generarPedidoCardHtml(selectedPedido);
                detailsContainer.innerHTML = pedidoHtml;
                // Aplica la clase de estado directamente al contenedor de la tarjeta seleccionada
                let tipoClase = '';
                switch (selectedPedido.estado.toLowerCase()) {
                    case 'listo': tipoClase = 'success'; break;
                    case 'en proceso': tipoClase = 'warning'; break;
                    case 'entregado': tipoClase = 'info-status'; break;
                    default: tipoClase = 'info'; break;
                }
                detailsContainer.classList.add(tipoClase);
            }
        }
    };

    // Función para renderizar los resultados de la búsqueda
    const renderizarResultados = (data) => {
        clearInterval(puntosInterval); // Detiene la animación de puntos
        resultadoDiv.classList.remove('shake'); // Remueve la clase de temblor
        resultadoDiv.innerHTML = ''; // Limpia el contenido previo
        resultadoDiv.className = 'result-display'; // Resetea a solo la clase base
        resultadoDiv.classList.remove('hidden'); // Asegura que no esté oculto
        resultadoDiv.classList.add('visible'); // Asegura que sea visible
        // Eliminado style.textAlign y style.display aquí para que CSS lo controle según .multi-pedido-display
        // resultadoDiv.style.textAlign = 'left'; 
        // resultadoDiv.style.display = 'block'; 

        if (data.pedidos && data.pedidos.length > 0) {
            // Ordenar pedidos por fecha, del más reciente al más antiguo para el desplegable
            currentPedidosData = [...data.pedidos].sort((a, b) => {
                const dateA = new Date(typeof a.fecha === 'number' ? (a.fecha - 25569) * 24 * 60 * 60 * 1000 : a.fecha);
                const dateB = new Date(typeof b.fecha === 'number' ? (b.fecha - 25569) * 24 * 60 * 60 * 1000 : b.fecha);
                return dateB.getTime() - dateA.getTime(); // Orden descendente (más reciente primero)
            });

            if (currentPedidosData.length > 1) {
                // Si hay múltiples pedidos, mostrar un desplegable
                const selectHtml = `
                    <div class="select-container">
                        <label for="pedidoFechaSelect" class="input-label">Seleccione la fecha del pedido:</label>
                        <select id="pedidoFechaSelect" class="cedula-input"></select>
                    </div>
                    <div id="selectedPedidoDetails">
                        <!-- Los detalles del pedido seleccionado se cargarán aquí -->
                    </div>
                `;
                resultadoDiv.innerHTML = selectHtml;
                resultadoDiv.classList.add('multi-pedido-display'); // Añade la clase para el layout de múltiples pedidos

                const selectElement = document.getElementById('pedidoFechaSelect');
                selectElement.innerHTML = ''; // Limpiar opciones anteriores

                currentPedidosData.forEach((pedido, index) => {
                    let fechaFormateada = 'Fecha N/A';
                    if (pedido.fecha) {
                        let jsDate;
                        if (typeof pedido.fecha === 'number') {
                            jsDate = new Date(Math.round((pedido.fecha - 25569) * 24 * 60 * 60 * 1000));
                        } else {
                            jsDate = new Date(pedido.fecha);
                        }
                        if (!isNaN(jsDate.getTime())) {
                            fechaFormateada = jsDate.toLocaleDateString('es-ES', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric'
                            });
                        }
                    }
                    const option = document.createElement('option');
                    option.value = index; // Usar el índice del pedido en currentPedidosData
                    option.textContent = fechaFormateada;
                    selectElement.appendChild(option);
                });

                // Establecer el primer pedido (más reciente) como seleccionado inicialmente
                selectElement.value = 0;
                mostrarPedidoSeleccionado(0); // Muestra los detalles del primer pedido

                // Listener para el cambio del desplegable
                selectElement.onchange = (event) => {
                    mostrarPedidoSeleccionado(event.target.value);
                };

            } else {
                // Si solo hay un pedido, mostrarlo directamente sin desplegable
                const pedido = currentPedidosData[0];
                const pedidoDetailsHtml = generarPedidoCardHtml(pedido);
                resultadoDiv.innerHTML = pedidoDetailsHtml;
                // Asegúrate de aplicar las clases de estado al contenedor principal si solo hay un card
                let tipoClase = '';
                switch (pedido.estado.toLowerCase()) {
                    case 'listo': tipoClase = 'success'; break;
                    case 'en proceso': tipoClase = 'warning'; break;
                    case 'entregado': tipoClase = 'info-status'; break;
                    default: tipoClase = 'info'; break;
                }
                resultadoDiv.classList.add(tipoClase); // Aplica la clase de estado al contenedor principal
            }

        } else if (data.estado === "No encontrado") {
            console.log('RUC not found in API response.');
            mostrarResultado('RUC no encontrado. Verifique el número.', 'danger');
            resultadoDiv.classList.add('shake');
        } else {
            console.error('API response format unexpected:', data);
            mostrarResultado('Ocurrió un error inesperado con la información. Intente de nuevo.', 'danger');
            resultadoDiv.classList.add('shake');
        }
    };


    // --- FUNCIÓN PRINCIPAL DE CONSULTA ---
    const ejecutarBusqueda = async () => {
        console.log('ejecutarBusqueda called.');
        const ruc = rucInput.value.trim(); // Obtiene el RUC del input y elimina espacios en blanco
        console.log('RUC input value:', ruc);

        resultadoDiv.classList.remove('shake'); // Remueve la clase de temblor si estaba presente

        if (!ruc) {
            console.log('RUC is empty. Showing error.');
            mostrarResultado('Por favor, ingrese su número de RUC.', 'danger');
            resultadoDiv.classList.add('shake'); // Añade temblor para indicar error
            return;
        }

        iniciarAnimacionPuntos(); // Inicia la animación de "Buscando..."

        try {
            // Construye la URL de la API con el RUC como parámetro 'ruc'
            const url = `${GOOGLE_APPS_SCRIPT_API_URL}?ruc=${encodeURIComponent(ruc)}`;
            console.log('URL de la API con RUC:', url); // Útil para depurar

            const response = await fetch(url); // Realiza la solicitud a la API
            
            if (!response.ok) { // Si la respuesta HTTP no es exitosa (ej. 404, 500, etc.)
                throw new Error(`Error en la API: ${response.status} ${response.statusText}`);
            }

            const data = await response.json(); // Parsea la respuesta JSON de la API
            console.log('API response data:', data);

            renderizarResultados(data); // Llama a la nueva función para manejar la visualización

        } catch (error) {
            clearInterval(puntosInterval); // Asegurarse de detener la animación en caso de error de red
            console.error('Error durante la llamada a la API:', error);
            mostrarResultado('Ocurrió un error al consultar. Por favor, intente de nuevo más tarde.', 'danger'); // Muestra mensaje de error genérico
            resultadoDiv.classList.add('shake'); // Añade temblor
        }
    };

    // --- EVENT LISTENERS ---
    if (buscarBtn) {
        buscarBtn.addEventListener('click', ejecutarBusqueda);
    } else {
        console.error('Error: "buscarBtn" no encontrado en el DOM!');
    }

    if (limpiarBtn) {
        limpiarBtn.addEventListener('click', limpiarPantalla);
    } else {
        console.error('Error: "limpiarBtn" no encontrado en el DOM!');
    }

    // Foco y flotabilidad de la caja principal (estilo visual)
    if (rucInput && appContainer) {
        rucInput.addEventListener('focus', () => {
            appContainer.classList.add('focused');
        });

        rucInput.addEventListener('blur', () => {
            // Solo remueve 'focused' si el input está vacío después de perder el foco
            if (rucInput.value.trim() === '') {
                appContainer.classList.remove('focused');
            }
        });

        // Asegura que la clase 'focused' se remueva si el input queda vacío después de una búsqueda
        buscarBtn.addEventListener('click', () => {
            setTimeout(() => { // Pequeño retraso para permitir que la lógica de búsqueda actualice el input
                if (rucInput.value.trim() === '') {
                   appContainer.classList.remove('focused');
                }
            }, 100);
        });

        // Asegura que la clase 'focused' se remueva al limpiar
        limpiarBtn.addEventListener('click', () => {
            appContainer.classList.remove('focused');
        });

        // Permite buscar con la tecla Enter en el campo RUC
        rucInput.addEventListener('keypress', (event) => {
            if (event.key === 'Enter') {
                event.preventDefault(); // Previene el comportamiento por defecto del Enter (ej. enviar formulario)
                ejecutarBusqueda();
            }
        });
    } else {
        console.error('Error: "rucInput" o "appContainer" no encontrado en el DOM!');
    }

    // --- INICIALIZACIÓN ---
    mostrarFechaHora(); // Muestra la fecha y hora al cargar
    setInterval(mostrarFechaHora, 1000); // Actualiza la fecha y hora cada segundo
    
    // Muestra el mensaje inicial al cargar la página
    resultadoDiv.innerHTML = '<p>Ingrese su RUC para consultar el estado de su documento.</p>';
    resultadoDiv.className = 'result-display info'; // Estilo 'info' para el mensaje inicial
    resultadoDiv.classList.remove('hidden'); // Asegura que no tenga la clase 'hidden'
    resultadoDiv.classList.add('visible'); // Asegura que tenga la clase 'visible'
    resultadoDiv.style.textAlign = 'center'; // Centra el mensaje inicial
    resultadoDiv.style.display = 'flex'; // Asegura display flex para centrar el mensaje inicial

}); // Fin de DOMContentLoaded