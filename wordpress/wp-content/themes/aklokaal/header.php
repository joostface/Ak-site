<?php
/**
 * Kop van elke pagina. Komt overeen met prototype/partials/header.html.
 */
defined( 'ABSPATH' ) || exit;
?><!doctype html>
<html <?php language_attributes(); ?><?php aktheme_html_attrs(); ?>>
<head>
<meta charset="<?php bloginfo( 'charset' ); ?>">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="dark light">
<?php wp_head(); ?>
</head>
<body <?php body_class(); ?><?php aktheme_body_attrs(); ?>>
<?php wp_body_open(); ?>
<a class="skip-link" href="#main"><?php esc_html_e( 'Naar de inhoud', 'aklokaal' ); ?></a>
<header class="site-header" data-header>
	<div class="site-header__bar">
		<a class="wordmark" href="<?php echo esc_url( home_url( '/' ) ); ?>">Aardrijkskunde<span>lokaal</span></a>
		<nav class="site-nav" id="site-nav" aria-label="<?php esc_attr_e( 'Hoofdmenu', 'aklokaal' ); ?>">
			<?php aktheme_nav(); ?>
		</nav>
		<div class="header-tools">
			<?php if ( function_exists( 'aklokaal_can_manage' ) && aklokaal_can_manage() ) : ?>
				<button class="button button--accent button--small admin-add" type="button" data-add-open aria-label="<?php esc_attr_e( 'Toevoegen', 'aklokaal' ); ?>">+<span class="admin-add__label"> <?php esc_html_e( 'Toevoegen', 'aklokaal' ); ?></span></button>
			<?php endif; ?>
			<button class="icon-button" type="button" data-search-open aria-label="<?php esc_attr_e( 'Zoeken', 'aklokaal' ); ?>">
				<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m15.5 15.5 5 5"/></svg>
			</button>
			<button class="icon-button theme-toggle" type="button" data-theme-toggle aria-label="<?php esc_attr_e( 'Wissel tussen donker en licht', 'aklokaal' ); ?>">
				<svg class="icon-moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" aria-hidden="true"><path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5Z"/></svg>
				<svg class="icon-sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="4.2"/><path d="M12 2.5v2.2M12 19.3v2.2M4.6 4.6l1.6 1.6M17.8 17.8l1.6 1.6M2.5 12h2.2M19.3 12h2.2M4.6 19.4l1.6-1.6M17.8 6.2l1.6-1.6"/></svg>
			</button>
			<button class="icon-button menu-toggle" type="button" data-menu-toggle aria-expanded="false" aria-controls="site-nav" aria-label="<?php esc_attr_e( 'Menu', 'aklokaal' ); ?>">
				<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16"/></svg>
			</button>
		</div>
	</div>
</header>
