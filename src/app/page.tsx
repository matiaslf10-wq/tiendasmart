import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import styles from './home.module.css';

export const metadata: Metadata = {
  title: 'TiendaSmart | Tu catálogo online. Tus pedidos en orden.',
  description: 'Mostrá tus productos, recibí pedidos por WhatsApp y organizá tu tienda desde un mismo lugar.',
};

const steps = [
  ['01', 'Dale lugar a tus productos', 'Creá tu catálogo con fotos, precios y categorías. Compartí el enlace de tu tienda donde están tus clientes.'],
  ['02', 'Recibí el pedido completo', 'Tu cliente arma el carrito, elige retiro o envío y continúa por WhatsApp. El pedido queda registrado en tu panel.'],
  ['03', 'Seguí cada venta', 'Organizá los estados de los pedidos y consultá tus productos, ventas y canales desde la administración.'],
];

export default function Home() {
  return (
    <main className={styles.page}>
      <a className={styles.skip} href="#contenido">Ir al contenido</a>
      <header className={styles.header}>
        <Link href="/" className={styles.brand} aria-label="TiendaSmart, inicio"><Image src="/logo-rendersmart.png" alt="RenderSmart" width={64} height={64} priority className={styles.mark} /><span className={styles.brandCopy}><span className={styles.wordmark}>Tienda<span>Smart</span></span><span className={styles.tagline}>Tecnología para comercios</span></span></Link>
        <nav aria-label="Navegación principal" className={styles.nav}>
          <a href="#como-funciona">Cómo funciona</a><a href="#preguntas">Preguntas frecuentes</a>
          <Link href="/login" className={styles.login}>Ingresar <span aria-hidden="true">↗</span></Link>
          <Link href="/signup" className={styles.signup}>Crear cuenta</Link>
        </nav>
      </header>
      <section className={styles.hero} id="contenido" aria-labelledby="hero-title">
        <div className={styles.copy}>
          <span className={styles.eyebrow}><i aria-hidden="true"/> COMERCIO DIGITAL, A TU MANERA</span>
          <h1 id="hero-title">Tu tienda online.<br/>El próximo paso<br/><em>de tu negocio.</em></h1>
          <p>Mostrá lo que vendés, recibí pedidos por WhatsApp y mantené todo en orden. Un catálogo para tus clientes. Un panel para vos.</p>
          <div className={styles.ctas}><a className={styles.primary} href="#vista-previa">Conocé la experiencia <span aria-hidden="true">↗</span></a><a className={styles.secondary} href="#como-funciona">Cómo funciona <span aria-hidden="true">↓</span></a></div>
          <div className={styles.notes}><span>✓ Catálogo con tu identidad</span><span>✓ Pedidos por WhatsApp</span></div>
          <div className={styles.signature}>Una solución de <strong>RenderSmart</strong></div>
        </div>
        <div className={styles.stage} id="vista-previa">
          <div className={styles.stageTop}><span>DEL CATÁLOGO AL PEDIDO</span><span>Vista ilustrativa</span></div>
          <div className={styles.store}>
            <div className={styles.browser}><span aria-hidden="true">● ● ●</span><span>Tu tienda · Catálogo</span><span aria-hidden="true">↗</span></div>
            <div className={styles.storeHeader}><strong>casa<span>norte</span></strong><span>Objetos para todos los días</span></div>
            <div className={styles.collection}><small>HECHO PARA TU CASA</small><h2>Lo simple.<br/>Lo que te gusta.</h2><span>Descubrí nuestra colección</span><div className={styles.vase} aria-hidden="true"/></div>
            <div className={styles.products}><div><div className={styles.productArt}><div className={styles.cup}/></div><strong>Taza de cerámica</strong><span>$ 12.000</span></div><div><div className={`${styles.productArt} ${styles.sand}`}><div className={styles.bowl}/></div><strong>Cuenco natural</strong><span>$ 9.500</span></div></div>
          </div>
          <div className={styles.order}><div className={styles.orderIcon} aria-hidden="true">✓</div><div><small>TODO EN TU PANEL</small><strong>Pedido #001 registrado</strong><span>2 productos · Retiro en tienda</span></div><span className={styles.pending}>Pendiente</span></div>
          <p className={styles.caption}>Tu identidad al frente. TiendaSmart detrás.</p>
        </div>
      </section>
      <section id="como-funciona" className={styles.how} aria-labelledby="how-title"><div className={styles.sectionHeading}><span>MENOS VUELTAS. MÁS ORDEN.</span><h2 id="how-title">De mostrar tus productos<br/>a gestionar tus pedidos.</h2></div><div className={styles.steps}>{steps.map(([n,title,description])=><article key={n}><span>{n}</span><h3>{title}</h3><p>{description}</p></article>)}</div></section>
      <section id="preguntas" className={styles.faq} aria-labelledby="faq-title"><div><span>ANTES DE EMPEZAR</span><h2 id="faq-title">Preguntas frecuentes</h2><p>Una forma más simple de organizar tu comercio digital.</p></div><div><details><summary>¿Cómo llegan los pedidos?</summary><p>El cliente completa su carrito y sus datos. TiendaSmart registra el pedido y prepara un mensaje para continuar la conversación por WhatsApp. Enviar el mensaje requiere la acción del cliente.</p></details><details><summary>¿Puedo ofrecer retiro y envío?</summary><p>El carrito incluye retiro en tienda o envío, con dirección de entrega cuando corresponde. La coordinación se realiza con el comercio.</p></details><details><summary>¿Incluye cobros online?</summary><p>Esta versión está orientada al catálogo y la gestión de pedidos. El pago se coordina con el comercio; no se presenta una pasarela de cobro integrada.</p></details><details><summary>¿Lo que veo es una tienda real?</summary><p>Casa Norte y el pedido de esta portada son ejemplos visuales. No realizan compras ni generan pedidos. Si ya tenés una cuenta, podés ingresar a tu administración.</p><Link href="/login">Ingresar a mi cuenta →</Link></details></div></section>
      <footer className={styles.footer}><Link href="/" className={styles.brand}>Tienda<span>Smart</span></Link><span>Comercio digital por RenderSmart</span><Link href="/login">Ingresar a mi tienda ↗</Link></footer>
    </main>
  );
}
