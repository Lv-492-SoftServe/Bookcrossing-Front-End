import {Component, OnInit, ViewChild} from '@angular/core';
import {TranslateService} from '@ngx-translate/core';
import {LanguageService} from '../../../core/services/language/language.service';
import {Language} from '../../../core/models/languages.enum';
import {AuthenticationMethod, AuthenticationService} from 'src/app/core/services/authentication/authentication.service';

@Component({
  selector: 'app-navbar',
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.scss']
})
export class NavbarComponent implements OnInit {
  @ViewChild('menu', {static: false}) menu: any;
  languages: Language[];
  isLoggedIn: boolean;
  canRegister: boolean;

  constructor(private authenticationService: AuthenticationService,
              private translate: TranslateService,
              public languageService: LanguageService)  { }

  ngOnInit() {
    this.isLoggedIn = this.authenticationService.isAuthenticated();
    this.canRegister = this.authenticationService.AuthMethod !== AuthenticationMethod.AzureActiveDirectory;
    this.languages = this.languageService.languages;
    this.authenticationService.getLoginEmitter().subscribe(() => {
      this.isLoggedIn = true;
    });
    this.authenticationService.getLogoutEmitter().subscribe(() => {
      this.isLoggedIn = false;
    });
  }

  redirectToLogin() {
    this.authenticationService.redirectToLogin();
  }
}
