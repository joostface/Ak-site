<?php
/**
 * Paginakop: grote titel op de as, met een inleidende zin.
 *
 * @var array $args title, lead
 */
defined( 'ABSPATH' ) || exit;
?>
<header class="page-title">
	<div class="page-title__inner">
		<h1 class="lines"><span class="line"><span data-line style="--i:0"><?php echo esc_html( $args['title'] ); ?></span></span></h1>
		<?php if ( ! empty( $args['lead'] ) ) : ?><p class="after-lines"><?php echo esc_html( $args['lead'] ); ?></p><?php endif; ?>
	</div>
</header>
