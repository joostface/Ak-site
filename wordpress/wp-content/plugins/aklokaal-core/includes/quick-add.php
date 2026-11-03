<?php
/**
 * "+ Toevoegen" op de gewone website.
 *
 * Voor ingelogde beheerders laadt de plugin het uploadvenster op elke pagina.
 * Het venster opent via:
 *   - de knop in de werkbalk bovenaan (admin bar),
 *   - elk element met het attribuut data-add-open (het thema zet zo'n knop in de kop).
 * Op een hoofdstukpagina zijn hoofdstuk en paragraaf al ingevuld: het thema zet
 * data-ak-chapter op <body> en data-ak-paragraph-id op elke paragraaf.
 */

defined( 'ABSPATH' ) || exit;

add_action(
	'wp_enqueue_scripts',
	function () {
		if ( ! is_user_logged_in() || ! aklokaal_can_manage() ) {
			return;
		}
		wp_enqueue_style( 'aklokaal-quick-add', AKLOKAAL_URL . 'assets/quick-add.css', array(), AKLOKAAL_VERSION );
		wp_enqueue_script( 'aklokaal-quick-add', AKLOKAAL_URL . 'assets/quick-add.js', array(), AKLOKAAL_VERSION, true );
		wp_localize_script( 'aklokaal-quick-add', 'AKLOKAAL', aklokaal_admin_config() );
	}
);

add_action(
	'admin_bar_menu',
	function ( $bar ) {
		if ( ! aklokaal_can_manage() ) {
			return;
		}
		$bar->add_node(
			array(
				'id'    => 'aklokaal-add',
				'title' => '+ ' . __( 'Toevoegen', 'aklokaal' ),
				'href'  => admin_url( 'admin.php?page=aklokaal-toevoegen' ),
				'meta'  => array( 'class' => 'aklokaal-adminbar-add' ),
			)
		);
		$bar->add_node(
			array(
				'parent' => 'aklokaal-add',
				'id'     => 'aklokaal-add-materiaal',
				'title'  => __( 'Materiaal of nieuwslink', 'aklokaal' ),
				'href'   => admin_url( 'admin.php?page=aklokaal-toevoegen' ),
			)
		);
		$bar->add_node(
			array(
				'parent' => 'aklokaal-add',
				'id'     => 'aklokaal-add-bericht',
				'title'  => __( 'Eigen nieuwsbericht schrijven', 'aklokaal' ),
				'href'   => admin_url( 'post-new.php?post_type=ak_nieuws' ),
			)
		);
	},
	80
);

/** Lichaamsklasse zodat het thema beheerknoppen kan tonen. */
add_filter(
	'body_class',
	function ( $classes ) {
		if ( is_user_logged_in() && aklokaal_can_manage() ) {
			$classes[] = 'is-admin';
		}
		return $classes;
	}
);
